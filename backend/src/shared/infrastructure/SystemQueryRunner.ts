import { Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * SystemQueryRunner — escape hatch from RLS for genuine system flows.
 *
 * Use cases:
 *   - LoginUseCase: lookup user by email BEFORE the JWT (and thus the tenant_id)
 *     is known. RLS would block the query because no tenant is bound.
 *   - Tenant provisioning: create the row that other RLS policies reference.
 *   - Cross-tenant analytics jobs: explicit, audited reads.
 *
 * How it bypasses RLS:
 *   - The DB role used by the application is granted BYPASSRLS only on
 *     the specific tables consulted via this runner (users, tenants).
 *   - Queries here run OUTSIDE of TenantContext.run(), so the
 *     TenantRlsSubscriber does not call set_config('app.current_tenant', ...).
 *
 * Operationally: any call here MUST be justified — never use as a shortcut
 * to skip RLS in regular business flows.
 */
@Injectable()
export class SystemQueryRunner {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Returns a QueryBuilder bound to the system DB connection (no tenant).
   * Caller MUST scope by id/email/etc. — there is NO RLS protection here.
   */
  query<T extends ObjectLiteral>(
    target: EntityTarget<T>,
    alias: string,
  ): SelectQueryBuilder<T> {
    return this.dataSource.getRepository(target).createQueryBuilder(alias);
  }

  /** Escape hatch for raw SQL (migrations, low-level checks). */
  async raw<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
    return this.dataSource.query(sql, params);
  }
}
