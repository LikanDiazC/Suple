import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type CampaignChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'META' | 'GOOGLE_ADS';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

@Entity({ name: 'marketing_campaigns' })
@Index('idx_camp_tenant_status', ['tenantId', 'status'])
export class CampaignOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'channel', type: 'varchar', length: 32 })
  channel!: CampaignChannel;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'DRAFT' })
  status!: CampaignStatus;

  @Column({ name: 'audience', type: 'jsonb', default: () => "'{}'::jsonb" })
  audience!: Record<string, unknown>;

  @Column({ name: 'content', type: 'jsonb', default: () => "'{}'::jsonb" })
  content!: Record<string, unknown>;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
