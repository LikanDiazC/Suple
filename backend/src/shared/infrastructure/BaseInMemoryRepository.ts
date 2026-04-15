import { Entity } from '../kernel/Entity';

/**
 * Generic base class for all in-memory repositories.
 *
 * Eliminates duplicated CRUD logic (findById, save, saveMany, paginate)
 * across the 7+ InMemory*Repository implementations. Subclasses only
 * need to implement domain-specific query/filter methods.
 *
 * NOTE: These repositories are singleton-scoped (NestJS default) and store
 * data in a Map. Suitable for dev/testing only — production should use
 * a real database with optimistic locking and row-level tenant isolation.
 */
export abstract class BaseInMemoryRepository<T extends Entity<any>> {
  protected readonly store = new Map<string, T>();

  // ── Common CRUD ────────────────────────────────────────────────────────────

  async findById(tenantId: string, id: string): Promise<T | null> {
    const entity = this.store.get(id);
    if (!entity) return null;
    return entity.tenantId === tenantId ? entity : null;
  }

  async save(entity: T): Promise<void> {
    this.store.set(entity.id.toString(), entity);
  }

  async saveMany(entities: T[]): Promise<void> {
    for (const entity of entities) {
      this.store.set(entity.id.toString(), entity);
    }
  }

  // ── Helpers for subclasses ─────────────────────────────────────────────────

  /** Returns all entities belonging to the given tenant. */
  protected allForTenant(tenantId: string): T[] {
    return [...this.store.values()].filter((e) => e.tenantId === tenantId);
  }

  /** Slices a filtered array into { items, total } using page/limit. */
  protected paginate(
    items: T[],
    page: number,
    limit: number,
  ): { items: T[]; total: number } {
    const total = items.length;
    const start = (page - 1) * limit;
    return { items: items.slice(start, start + limit), total };
  }

  /** Looks up multiple entities by ID, scoped to a single tenant. */
  async findByIds(tenantId: string, ids: string[]): Promise<T[]> {
    return ids
      .map((id) => this.store.get(id))
      .filter((e): e is T => !!e && e.tenantId === tenantId);
  }
}
