import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * AsyncLocalStorage that propagates the current tenant_id across the
 * async call chain (controller → use case → repository → TypeORM transaction).
 *
 * The TenantRlsSubscriber reads from here on `beforeTransaction` to set
 * `app.current_tenant` via SET LOCAL inside each PostgreSQL transaction.
 *
 * The IAM TenantMiddleware writes to here at request entry, then calls
 * `next()` inside `als.run(...)`.
 */

export interface TenantContextStore {
  tenantId: string;
  userId?: string;
  roles?: string[];
}

const als = new AsyncLocalStorage<TenantContextStore>();

export const TenantContext = {
  run<T>(store: TenantContextStore, fn: () => T): T {
    return als.run(store, fn);
  },

  get(): string | undefined {
    return als.getStore()?.tenantId;
  },

  getStore(): TenantContextStore | undefined {
    return als.getStore();
  },

  /** Required: throws if no tenant is active (defensive use in repositories). */
  require(): string {
    const tenantId = als.getStore()?.tenantId;
    if (!tenantId) {
      throw new Error('TenantContext is empty. Request entered without TenantMiddleware.');
    }
    return tenantId;
  },
};
