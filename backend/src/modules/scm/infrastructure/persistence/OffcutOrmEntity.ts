import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'scm_offcuts' })
@Index('idx_offcuts_tenant_status', ['tenantId', 'status'])
export class OffcutOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'source_board_id', type: 'uuid', nullable: true })
  sourceBoardId!: string | null;

  @Column({ name: 'source_work_order_id', type: 'uuid', nullable: true })
  sourceWorkOrderId!: string | null;

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

  @Column({ name: 'reserved_by_work_order_id', type: 'uuid', nullable: true })
  reservedByWorkOrderId!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
