import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'bpms_process_instances' })
@Index('idx_pi_tenant_status', ['tenantId', 'status'])
export class ProcessInstanceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  definitionId!: string;

  @Column({ name: 'definition_version', type: 'int' })
  definitionVersion!: number;

  @Column({ name: 'definition_snapshot', type: 'jsonb' })
  definitionSnapshot!: unknown;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'ACTIVE' })
  status!: string;

  @Column({ name: 'active_node_ids', type: 'jsonb', default: () => "'[]'::jsonb" })
  activeNodeIds!: string[];

  @Column({ name: 'completed_node_ids', type: 'jsonb', default: () => "'[]'::jsonb" })
  completedNodeIds!: string[];

  @Column({ name: 'variables', type: 'jsonb', default: () => "'{}'::jsonb" })
  variables!: Record<string, unknown>;

  @Column({ name: 'join_arrival_count', type: 'jsonb', default: () => "'{}'::jsonb" })
  joinArrivalCount!: Record<string, number>;

  @Column({ name: 'started_by', type: 'varchar', length: 64 })
  startedBy!: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'NOW()' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'entity_ref', type: 'jsonb', nullable: true })
  entityRef!: { type: string; id: string } | null;
}
