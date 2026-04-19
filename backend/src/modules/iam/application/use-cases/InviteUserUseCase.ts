import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { IUserRepository, USER_REPOSITORY } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { TenantContext } from '../../../../shared/infrastructure/TenantContext';

export interface InviteUserInput {
  email: string;
  fullName: string;
  roleIds: string[];
}

export interface InviteUserOutput {
  userId: string;
  temporaryPassword: string;
}

@Injectable()
export class InviteUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(input: InviteUserInput): Promise<InviteUserOutput> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictException('A user with that email already exists');

    const tenantId = TenantContext.require();
    const tempPassword = randomBytes(12).toString('base64url');
    const hash = await bcrypt.hash(tempPassword, 12);

    const user = User.invite(tenantId, input.email, input.fullName, hash, input.roleIds);
    await this.users.save(user);

    return { userId: user.id.toString(), temporaryPassword: tempPassword };
  }
}
