import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'processed_events' })
export class ProcessedEventOrmEntity {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'topic', type: 'varchar', length: 255 })
  topic!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'consumer_name', type: 'varchar', length: 255 })
  consumerName!: string;

  @Column({ name: 'processed_at', type: 'timestamptz', default: () => 'NOW()' })
  processedAt!: Date;
}
