import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/IUserRepository';
import { JwtService } from '../../infrastructure/services/JwtService';
import { RoleOrmEntity } from '../../infrastructure/persistence/RoleOrmEntity';
import { UserRoleOrmEntity } from '../../infrastructure/persistence/UserOrmEntity';
import { TenantContext } from '../../../../shared/infrastructure/TenantContext';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  token: string;
  expiresAt: Date;
  mustChangePassword: boolean;
  user: { id: string; email: string; fullName: string; tenantId: string; roles: string[] };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly jwtService: JwtService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // Step 1: System lookup (BYPASS RLS — Directive 1)
    const user = await this.users.findByEmailAcrossTenants(input.email);
    if (!user) {
      // Constant-time-ish: still hash to avoid timing oracles
      await bcrypt.compare(input.password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalid.');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isLocked()) {
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      user.recordFailedLogin();
      // persist within tenant context to satisfy RLS
      await TenantContext.run({ tenantId: user.tenantId }, () => this.users.save(user));
      throw new UnauthorizedException('Invalid credentials');
    }

    user.recordSuccessfulLogin();
    await TenantContext.run({ tenantId: user.tenantId }, () => this.users.save(user));

    // Step 2: Resolve role names + permissions (system query — roles table is not RLS)
    const roleRows = await this.dataSource
      .getRepository(UserRoleOrmEntity)
      .createQueryBuilder('ur')
      .innerJoin(RoleOrmEntity, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :uid', { uid: user.id.toString() })
      .select(['r.name AS name', 'r.permissions AS permissions'])
      .getRawMany<{ name: string; permissions: string[] }>();

    const roles = roleRows.map(r => r.name);
    const permissions = Array.from(new Set(roleRows.flatMap(r => r.permissions ?? [])));

    const { token, expiresAt } = this.jwtService.issue({
      userId: user.id.toString(),
      tenantId: user.tenantId,
      email: user.email,
      roles,
      permissions,
    });

    return {
      token,
      expiresAt,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        tenantId: user.tenantId,
        roles,
      },
    };
  }
}
