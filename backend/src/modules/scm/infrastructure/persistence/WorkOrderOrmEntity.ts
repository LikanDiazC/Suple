import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'scm_work_orders' })
@Index('idx_wo_tenant_status', ['tenantId', 'status'])
export class WorkOrderOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'PENDING' })
  status!: string;

  @Column({ name: 'requirements', type: 'jsonb', default: () => "'[]'::jsonb" })
  requirements!: Record<string, unknown>[] | unknown[];

  @Column({ name: 'cutting_plan', type: 'jsonb', nullable: true })
  cuttingPlan!: Record<string, unknown> | null;

  @Column({ name: 'reserved_stock_ids', type: 'jsonb', default: () => "'[]'::jsonb" })
  reservedStockIds!: string[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
