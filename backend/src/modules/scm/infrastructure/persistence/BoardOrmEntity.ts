import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'scm_boards' })
@Index('idx_boards_tenant_status', ['tenantId', 'status'])
export class BoardOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'material_sku', type: 'varchar', length: 64 })
  materialSku!: string;

  @Column({ name: 'thickness_mm', type: 'numeric', precision: 8, scale: 2 })
  thicknessMm!: string;

  @Column({ name: 'width_mm', type: 'int' })
  widthMm!: number;

  @Column({ name: 'height_mm', type: 'int' })
  heightMm!: number;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'AVAILABLE' })
  status!: string;

  @Column({ name: 'location', type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ name: 'batch_code', type: 'varchar', length: 64, nullable: true })
  batchCode!: string | null;

  @Column({ name: 'reserved_by_work_order_id', type: 'uuid', nullable: true })
  reservedByWorkOrderId!: string | null;

  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'NOW()' })
  receivedAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
