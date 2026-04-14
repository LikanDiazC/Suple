import { UniqueId } from './UniqueId';

/**
 * Base class for all domain entities.
 * Entities are defined by their identity (UniqueId), not by their attributes.
 * Two entities with the same ID are considered equal regardless of attribute values.
 *
 * In a multi-tenant architecture, every entity carries an immutable tenantId
 * to enforce data isolation at the domain level -- before it ever reaches
 * the infrastructure layer.
 */
export abstract class Entity<TProps> {
  public readonly id: UniqueId;
  public readonly tenantId: string;
  protected props: TProps;

  protected constructor(id: UniqueId, tenantId: string, props: TProps) {
    this.id = id;
    this.tenantId = tenantId;
    this.props = props;
  }

  equals(other: Entity<TProps>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this.id.equals(other.id);
  }
}
