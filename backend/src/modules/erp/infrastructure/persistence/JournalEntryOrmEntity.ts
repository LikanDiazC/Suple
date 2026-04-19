import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'journal_entries' })
@Index('idx_je_tenant_year_period', ['tenantId', 'fiscalYear', 'fiscalPeriod'])
export class JournalEntryOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'reference', type: 'varchar', length: 64 })
  reference!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate!: Date;

  @Column({ name: 'document_date', type: 'date', nullable: true })
  documentDate!: Date | null;

  @Column({ name: 'fiscal_year', type: 'int', nullable: true })
  fiscalYear!: number | null;

  @Column({ name: 'fiscal_period', type: 'int', nullable: true })
  fiscalPeriod!: number | null;

  @Column({ name: 'currency', type: 'char', length: 3, default: 'CLP' })
  currency!: string;

  @Column({ name: 'source', type: 'varchar', length: 32, default: 'MANUAL' })
  source!: string;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'DRAFT' })
  status!: string;

  @Column({ name: 'reversal_of_entry_id', type: 'uuid', nullable: true })
  reversalOfEntryId!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'posted_at', type: 'timestamptz', nullable: true })
  postedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @OneToMany(() => JournalLineItemOrmEntity, (li) => li.entry, { cascade: true, eager: true })
  lineItems!: JournalLineItemOrmEntity[];
}

@Entity({ name: 'journal_line_items' })
@Index('idx_jli_entry', ['entry'])
export class JournalLineItemOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => JournalEntryOrmEntity, (e) => e.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry!: JournalEntryOrmEntity;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'line_number', type: 'int', nullable: true })
  lineNumber!: number | null;

  @Column({ name: 'account_code', type: 'varchar', length: 32 })
  accountCode!: string;

  @Column({ name: 'type', type: 'varchar', length: 8 })
  type!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;

  @Column({ name: 'currency', type: 'char', length: 3, default: 'CLP' })
  currency!: string;

  @Column({ name: 'cost_center', type: 'varchar', length: 32, nullable: true })
  costCenter!: string | null;

  @Column({ name: 'profit_center', type: 'varchar', length: 32, nullable: true })
  profitCenter!: string | null;

  @Column({ name: 'business_partner', type: 'varchar', length: 64, nullable: true })
  businessPartner!: string | null;

  @Column({ name: 'asset_id', type: 'varchar', length: 64, nullable: true })
  assetId!: string | null;

  @Column({ name: 'memo', type: 'text', nullable: true })
  memo!: string | null;

  @Column({ name: 'dimensions', type: 'jsonb', default: () => "'{}'::jsonb" })
  dimensions!: Record<string, string>;
}
