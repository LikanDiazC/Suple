import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'gmail_sent_messages' })
@Index('idx_gmail_sent_tenant', ['tenantId'])
@Index('idx_gmail_sent_contact', ['contactId'])
@Index('idx_gmail_sent_deal', ['dealId'])
@Index('idx_gmail_sent_token', ['trackingToken'])
@Index('idx_gmail_sent_thread', ['gmailThreadId'])
export class GmailSentMessageOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'gmail_message_id', type: 'varchar', length: 255, nullable: true })
  gmailMessageId!: string | null;

  @Column({ name: 'gmail_thread_id', type: 'varchar', length: 255, nullable: true })
  gmailThreadId!: string | null;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId!: string | null;

  @Column({ name: 'deal_id', type: 'uuid', nullable: true })
  dealId!: string | null;

  @Column({ name: 'to_email', type: 'varchar', length: 255 })
  toEmail!: string;

  @Column({ name: 'subject', type: 'varchar', length: 500, nullable: true })
  subject!: string | null;

  @Column({ name: 'tracking_token', type: 'uuid', default: () => 'uuid_generate_v4()' })
  trackingToken!: string;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'NOW()' })
  sentAt!: Date;

  @Column({ name: 'first_opened_at', type: 'timestamptz', nullable: true })
  firstOpenedAt!: Date | null;

  @Column({ name: 'open_count', type: 'int', default: 0 })
  openCount!: number;

  @Column({ name: 'first_reply_at', type: 'timestamptz', nullable: true })
  firstReplyAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
