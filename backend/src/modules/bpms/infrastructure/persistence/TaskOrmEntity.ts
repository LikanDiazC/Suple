import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'bpms_tasks' })
@Index('idx_task_tenant_status', ['tenantId', 'status'])
@Index('idx_task_tenant_assignee', ['tenantId', 'assigneeUserId'])
@Index('idx_task_tenant_role', ['tenantId', 'assigneeRole'])
export class TaskOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'instance_id', type: 'uuid' })
  instanceId!: string;

  @Column({ name: 'definition_id', type: 'uuid' })
  definitionId!: string;

  @Column({ name: 'node_id', type: 'varchar', length: 64 })
  nodeId!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'description', type: 'text', default: '' })
  description!: string;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'PENDING' })
  status!: string;

  @Column({ name: 'assignee_user_id', type: 'varchar', length: 64, nullable: true })
  assigneeUserId!: string | null;

  @Column({ name: 'assignee_role', type: 'varchar', length: 64, nullable: true })
  assigneeRole!: string | null;

  @Column({ name: 'claimed_by', type: 'varchar', length: 64, nullable: true })
  claimedBy!: string | null;

  @Column({ name: 'claimed_at', type: 'timestamptz', nullable: true })
  claimedAt!: Date | null;

  @Column({ name: 'completed_by', type: 'varchar', length: 64, nullable: true })
  completedBy!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate!: Date | null;

  @Column({ name: 'outcome', type: 'varchar', length: 64, nullable: true })
  outcome!: string | null;

  @Column({ name: 'form', type: 'jsonb', default: () => "'[]'::jsonb" })
  form!: unknown[];

  @Column({ name: 'approval_outcomes', type: 'jsonb', default: () => "'[]'::jsonb" })
  approvalOutcomes!: string[];

  @Column({ name: 'submission', type: 'jsonb', nullable: true })
  submission!: Record<string, unknown> | null;

  @Column({ name: 'comments', type: 'jsonb', default: () => "'[]'::jsonb" })
  comments!: unknown[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
