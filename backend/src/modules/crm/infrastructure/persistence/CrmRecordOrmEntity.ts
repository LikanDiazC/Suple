import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'crm_records' })
@Index('idx_crm_tenant_type', ['tenantId', 'objectType'])
export class CrmRecordOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'object_definition_id', type: 'uuid', nullable: true })
  objectDefinitionId!: string | null;

  @Column({ name: 'object_type', type: 'varchar', length: 64 })
  objectType!: string;

  @Column({ name: 'properties', type: 'jsonb', default: () => "'{}'::jsonb" })
  properties!: Record<string, unknown>;

  @Column({ name: 'email', type: 'varchar', length: 320, nullable: true })
  email!: string | null;

  @Column({ name: 'domain', type: 'varchar', length: 255, nullable: true })
  domain!: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 512, nullable: true })
  displayName!: string | null;

  @Column({ name: 'owner_id', type: 'varchar', length: 64, nullable: true })
  ownerId!: string | null;

  @Column({ name: 'lifecycle_stage', type: 'varchar', length: 64, nullable: true })
  lifecycleStage!: string | null;

  @Column({ name: 'lead_status', type: 'varchar', length: 64, nullable: true })
  leadStatus!: string | null;

  @Column({ name: 'archived', type: 'boolean', default: false })
  archived!: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;

  @Column({ name: 'last_activity', type: 'timestamptz', nullable: true })
  lastActivity!: Date | null;
}

@Entity({ name: 'crm_associations' })
export class CrmAssociationOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'from_record_id', type: 'uuid' })
  fromRecordId!: string;

  @Column({ name: 'to_record_id', type: 'uuid' })
  toRecordId!: string;

  @Column({ name: 'association_type', type: 'varchar', length: 64 })
  associationType!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}

@Entity({ name: 'crm_object_definitions' })
export class CrmObjectDefinitionOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'object_type', type: 'varchar', length: 64 })
  objectType!: string;

  @Column({ name: 'label_singular', type: 'varchar', length: 128 })
  labelSingular!: string;

  @Column({ name: 'label_plural', type: 'varchar', length: 128 })
  labelPlural!: string;

  @Column({ name: 'properties_schema', type: 'jsonb', default: () => "'[]'::jsonb" })
  propertiesSchema!: unknown[];

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}
