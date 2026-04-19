import { EventSubscriber, EntitySubscriberInterface, TransactionStartEvent } from 'typeorm';
import { TenantContext } from './TenantContext';

/**
 * TypeORM subscriber that injects the current tenant_id into every
 * transaction via PostgreSQL's `set_config(..., is_local := true)`.
 *
 * `is_local := true` is equivalent to `SET LOCAL`: the value lives only
 * inside the current transaction and is automatically cleared on
 * COMMIT or ROLLBACK. This protects the connection pool: a connection
 * returning to the pool never carries a stale tenant binding.
 *
 * RLS policies on every business table reference `current_setting('app.current_tenant')`
 * to filter rows. Without this subscriber, RLS denies all queries.
 */
@EventSubscriber()
export class TenantRlsSubscriber implements EntitySubscriberInterface {
  async beforeTransactionStart(event: TransactionStartEvent): Promise<void> {
    const tenantId = TenantContext.get();
    if (!tenantId) {
      // System-level transactions (login, migrations) skip the binding
      // by intentionally running OUTSIDE TenantContext.run().
      return;
    }
    // is_local := true → equivalent to SET LOCAL (cleared on commit/rollback).
    await event.queryRunner.query(
      `SELECT set_config('app.current_tenant', $1, true)`,
      [tenantId],
    );
  }
}
