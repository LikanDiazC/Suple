import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'bpms_process_definitions' })
@Index('idx_pd_tenant_status', ['tenantId', 'status'])
export class ProcessDefinitionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'description', type: 'text', default: '' })
  description!: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'DRAFT' })
  status!: string;

  @Column({ name: 'category', type: 'varchar', length: 64 })
  category!: string;

  @Column({ name: 'icon', type: 'varchar', length: 64, nullable: true })
  icon!: string | null;

  @Column({ name: 'nodes', type: 'jsonb', default: () => "'[]'::jsonb" })
  nodes!: unknown[];

  @Column({ name: 'transitions', type: 'jsonb', default: () => "'[]'::jsonb" })
  transitions!: unknown[];

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
