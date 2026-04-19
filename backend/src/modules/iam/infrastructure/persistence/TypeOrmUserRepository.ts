import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { User } from '../../domain/entities/User';
import { IUserRepository, UserSummary } from '../../domain/repositories/IUserRepository';
import { UserOrmEntity, UserRoleOrmEntity } from './UserOrmEntity';
import { SystemQueryRunner } from '../../../../shared/infrastructure/SystemQueryRunner';
import { UniqueId } from '../../../../shared/kernel';
import { TenantContext } from '../../../../shared/infrastructure/TenantContext';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
    @InjectRepository(UserRoleOrmEntity)
    private readonly userRoles: Repository<UserRoleOrmEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly system: SystemQueryRunner,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.dataSource.transaction(async (mgr) => {
      const row = await mgr.findOne(UserOrmEntity, { where: { id } });
      if (!row) return null;
      const roles = await mgr.find(UserRoleOrmEntity, { where: { userId: id } });
      return this.toDomain(row, roles.map(r => r.roleId));
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.dataSource.transaction(async (mgr) => {
      const row = await mgr.findOne(UserOrmEntity, {
        where: { email: email.toLowerCase() },
      });
      if (!row) return null;
      const roles = await mgr.find(UserRoleOrmEntity, { where: { userId: row.id } });
      return this.toDomain(row, roles.map(r => r.roleId));
    });
  }

  /**
   * BYPASSES RLS — used only by LoginUseCase before the JWT exists.
   * Runs OUTSIDE TenantContext.run() so the TenantRlsSubscriber does
   * not bind app.current_tenant.
   */
  async findByEmailAcrossTenants(email: string): Promise<User | null> {
    const rows: UserOrmEntity[] = await this.system.raw(
      `SELECT id, tenant_id AS "tenantId", email, password_hash AS "passwordHash",
              full_name AS "fullName", status, must_change_password AS "mustChangePassword",
              last_login_at AS "lastLoginAt", failed_login_count AS "failedLoginCount",
              locked_until AS "lockedUntil", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()],
    );
    const row = rows[0];
    if (!row) return null;
    const roleRows: { roleId: string }[] = await this.system.raw(
      `SELECT role_id AS "roleId" FROM user_roles WHERE user_id = $1`,
      [row.id],
    );
    return this.toDomain(row, roleRows.map(r => r.roleId));
  }

  async save(user: User): Promise<void> {
    const tenantId = TenantContext.get() ?? user.tenantId;
    await this.dataSource.transaction(async (mgr) => {
      await mgr.upsert(
        UserOrmEntity,
        {
          id: user.id.toString(),
          tenantId,
          email: user.email,
          passwordHash: user.passwordHash,
          fullName: user.fullName,
          status: user.status,
          mustChangePassword: user.mustChangePassword,
          lastLoginAt: (user as unknown as { props: { lastLoginAt: Date | null } }).props.lastLoginAt,
          failedLoginCount: (user as unknown as { props: { failedLoginCount: number } }).props.failedLoginCount,
          lockedUntil: (user as unknown as { props: { lockedUntil: Date | null } }).props.lockedUntil,
          updatedAt: new Date(),
        },
        ['id'],
      );

      // Sync user_roles: delete + reinsert
      await mgr.delete(UserRoleOrmEntity, { userId: user.id.toString() });
      if (user.roleIds.length > 0) {
        await mgr.insert(
          UserRoleOrmEntity,
          user.roleIds.map(roleId => ({
            userId: user.id.toString(),
            roleId,
            tenantId,
          })),
        );
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.users.delete({ id });
  }

  async listByTenant(): Promise<UserSummary[]> {
    const tenantId = TenantContext.get();
    const rows = await this.dataSource.query(
      `SELECT u.id, u.email, u.full_name AS "fullName", u.status,
              u.manager_id AS "managerId", u.created_at AS "createdAt",
              COALESCE(r.name, 'operator') AS role
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.tenant_id = $1
       ORDER BY u.created_at ASC`,
      [tenantId],
    );
    return rows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      email: r.email as string,
      fullName: r.fullName as string,
      status: (r.status as string).toLowerCase(),
      role: r.role as string,
      managerId: r.managerId as string | null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }

  async setManager(userId: string, managerId: string | null): Promise<void> {
    await this.dataSource.transaction(async (mgr) => {
      await mgr.update(UserOrmEntity, { id: userId }, { managerId });
    });
  }

  private toDomain(row: UserOrmEntity, roleIds: string[]): User {
    return User.rehydrate(UniqueId.from(row.id), row.tenantId, {
      email: row.email,
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      status: row.status as 'ACTIVE' | 'INVITED' | 'DISABLED',
      mustChangePassword: row.mustChangePassword,
      lastLoginAt: row.lastLoginAt,
      failedLoginCount: row.failedLoginCount,
      lockedUntil: row.lockedUntil,
      roleIds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
