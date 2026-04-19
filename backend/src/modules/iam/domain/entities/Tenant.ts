import { AggregateRoot, UniqueId } from '../../../../shared/kernel';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type TenantPlan = 'TRIAL' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

interface TenantProps {
  slug: string;
  name: string;
  status: TenantStatus;
  plan: TenantPlan;
  createdAt: Date;
  updatedAt: Date;
}

export class Tenant extends AggregateRoot<TenantProps> {
  private constructor(id: UniqueId, props: TenantProps) {
    // tenantId === id for the Tenant aggregate itself
    super(id, id.toString(), props);
  }

  static create(slug: string, name: string): Tenant {
    if (!/^[a-z][a-z0-9-]{2,63}$/.test(slug)) {
      throw new Error(`Invalid tenant slug: ${slug}`);
    }
    const now = new Date();
    return new Tenant(UniqueId.create(), {
      slug, name,
      status: 'ACTIVE',
      plan: 'TRIAL',
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(id: UniqueId, props: TenantProps): Tenant {
    return new Tenant(id, props);
  }

  suspend(): void {
    if (this.props.status === 'CANCELLED') {
      throw new Error('Cannot suspend a cancelled tenant');
    }
    this.props.status = 'SUSPENDED';
    this.props.updatedAt = new Date();
  }

  reactivate(): void {
    if (this.props.status !== 'SUSPENDED') {
      throw new Error('Only suspended tenants can be reactivated');
    }
    this.props.status = 'ACTIVE';
    this.props.updatedAt = new Date();
  }

  get slug(): string { return this.props.slug; }
  get name(): string { return this.props.name; }
  get status(): TenantStatus { return this.props.status; }
  get plan(): TenantPlan { return this.props.plan; }
  get isActive(): boolean { return this.props.status === 'ACTIVE'; }
}
