import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';

/**
 * ==========================================================================
 * CRM Object Definition (Meta-Model)
 * ==========================================================================
 *
 * Represents the SCHEMA of a CRM object type (e.g., "Contact", "Company",
 * "Deal", "Ticket", or any Custom Object). This is NOT an instance of a
 * record -- it defines WHAT properties a record of this type can have.
 *
 * This is the equivalent of HubSpot's Object Definition layer:
 *   - Standard Objects: contacts, companies, deals, tickets
 *   - Custom Objects: user-defined with custom properties
 *
 * Architecture Decision (Ref: Hybrid Schema from research):
 *   Standard fields (name, email, domain) live in typed SQL columns
 *   for indexing and query performance. Dynamic/custom properties
 *   use a Property Registry + EAV (Entity-Attribute-Value) pattern
 *   backed by a JSONB column for flexible schema evolution without
 *   DDL migrations per tenant.
 *
 * Justification:
 *   HubSpot manages 300M+ custom entities via metadata architecture.
 *   Pure EAV is slow for filtering; pure SQL is rigid for custom fields.
 *   The hybrid approach gives us both: SQL indexes on hot columns,
 *   JSONB flexibility for long-tail custom properties.
 * ==========================================================================
 */

export enum ObjectType {
  CONTACT = 'CONTACT',
  COMPANY = 'COMPANY',
  DEAL = 'DEAL',
  TICKET = 'TICKET',
  CUSTOM = 'CUSTOM',
}

export enum PropertyType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',          // Single select
  MULTI_ENUM = 'MULTI_ENUM', // Multi select
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  URL = 'URL',
  CURRENCY = 'CURRENCY',
  TEXTAREA = 'TEXTAREA',
  CALCULATED = 'CALCULATED', // Formula-based
}

export interface PropertyDefinition {
  name: string;           // Internal name (snake_case): "first_name"
  label: string;          // Display label: "First Name"
  type: PropertyType;
  groupName: string;      // Property group: "contactinformation"
  required: boolean;
  unique: boolean;        // Enforce uniqueness within tenant (e.g., email)
  indexed: boolean;       // Create DB index for filter performance
  defaultValue?: unknown;
  options?: PropertyOption[];  // For ENUM / MULTI_ENUM types
  formula?: string;       // For CALCULATED type
  isSystem: boolean;      // System properties cannot be deleted
  displayOrder: number;
  hidden: boolean;
}

export interface PropertyOption {
  value: string;
  label: string;
  displayOrder: number;
  hidden: boolean;
}

export interface PropertyGroup {
  name: string;
  label: string;
  displayOrder: number;
  properties: string[];   // Property names in this group
}

interface ObjectDefinitionProps {
  name: string;           // "contacts", "companies", "custom_inventory"
  label: string;          // "Contacts", "Companies", "Inventory"
  labelPlural: string;
  type: ObjectType;
  primaryDisplayProperty: string;   // Which property shows as the record "name"
  secondaryDisplayProperties: string[];
  searchableProperties: string[];   // Properties included in full-text search
  properties: Map<string, PropertyDefinition>;
  propertyGroups: PropertyGroup[];
  requiredProperties: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ObjectDefinition extends AggregateRoot<ObjectDefinitionProps> {
  private constructor(id: UniqueId, tenantId: string, props: ObjectDefinitionProps) {
    super(id, tenantId, props);
  }

  static createStandardContact(tenantId: string): ObjectDefinition {
    const properties = new Map<string, PropertyDefinition>();

    const contactProps: PropertyDefinition[] = [
      { name: 'first_name',     label: 'First Name',     type: PropertyType.TEXT,   groupName: 'contactinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 1, hidden: false },
      { name: 'last_name',      label: 'Last Name',      type: PropertyType.TEXT,   groupName: 'contactinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 2, hidden: false },
      { name: 'email',          label: 'Email',           type: PropertyType.EMAIL,  groupName: 'contactinformation', required: true,  unique: true,  indexed: true,  isSystem: true, displayOrder: 3, hidden: false },
      { name: 'phone',          label: 'Phone Number',    type: PropertyType.PHONE,  groupName: 'contactinformation', required: false, unique: false, indexed: false, isSystem: true, displayOrder: 4, hidden: false },
      { name: 'lifecycle_stage',label: 'Lifecycle Stage', type: PropertyType.ENUM,   groupName: 'contactinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 5, hidden: false,
        options: [
          { value: 'subscriber',          label: 'Subscriber',          displayOrder: 1, hidden: false },
          { value: 'lead',                label: 'Lead',                displayOrder: 2, hidden: false },
          { value: 'marketing_qualified', label: 'Marketing Qualified', displayOrder: 3, hidden: false },
          { value: 'sales_qualified',     label: 'Sales Qualified',     displayOrder: 4, hidden: false },
          { value: 'opportunity',         label: 'Opportunity',         displayOrder: 5, hidden: false },
          { value: 'customer',            label: 'Customer',            displayOrder: 6, hidden: false },
          { value: 'evangelist',          label: 'Evangelist',          displayOrder: 7, hidden: false },
        ],
      },
      { name: 'lead_status',    label: 'Lead Status',     type: PropertyType.ENUM,   groupName: 'contactinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 6, hidden: false,
        options: [
          { value: 'new',            label: 'New',            displayOrder: 1, hidden: false },
          { value: 'open',           label: 'Open',           displayOrder: 2, hidden: false },
          { value: 'in_progress',    label: 'In Progress',    displayOrder: 3, hidden: false },
          { value: 'unqualified',    label: 'Unqualified',    displayOrder: 4, hidden: false },
        ],
      },
      { name: 'owner_id',       label: 'Contact Owner',   type: PropertyType.TEXT,   groupName: 'contactinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 7, hidden: false },
      { name: 'create_date',    label: 'Create Date',     type: PropertyType.DATETIME, groupName: 'contactinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 8, hidden: false },
      { name: 'last_activity',  label: 'Last Activity',   type: PropertyType.DATETIME, groupName: 'contactactivity',    required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 1, hidden: false },
      { name: 'content_topics', label: 'Favorite Content Topics', type: PropertyType.MULTI_ENUM, groupName: 'conversioninformation', required: false, unique: false, indexed: false, isSystem: true, displayOrder: 1, hidden: false, options: [] },
      { name: 'preferred_channels', label: 'Preferred Channels', type: PropertyType.MULTI_ENUM, groupName: 'conversioninformation', required: false, unique: false, indexed: false, isSystem: true, displayOrder: 2, hidden: false, options: [] },
    ];

    contactProps.forEach((p) => properties.set(p.name, p));

    const now = new Date();
    return new ObjectDefinition(UniqueId.create(), tenantId, {
      name: 'contacts',
      label: 'Contact',
      labelPlural: 'Contacts',
      type: ObjectType.CONTACT,
      primaryDisplayProperty: 'email',
      secondaryDisplayProperties: ['first_name', 'last_name', 'phone'],
      searchableProperties: ['first_name', 'last_name', 'email', 'phone'],
      properties,
      propertyGroups: [
        { name: 'contactinformation',    label: 'Contact Information',    displayOrder: 1, properties: ['first_name', 'last_name', 'email', 'phone', 'lifecycle_stage', 'lead_status', 'owner_id', 'create_date'] },
        { name: 'contactactivity',       label: 'Contact Activity',       displayOrder: 2, properties: ['last_activity'] },
        { name: 'conversioninformation', label: 'Conversion Information', displayOrder: 3, properties: ['content_topics', 'preferred_channels'] },
      ],
      requiredProperties: ['email'],
      createdAt: now,
      updatedAt: now,
    });
  }

  static createStandardCompany(tenantId: string): ObjectDefinition {
    const properties = new Map<string, PropertyDefinition>();

    const companyProps: PropertyDefinition[] = [
      { name: 'name',           label: 'Company Name',    type: PropertyType.TEXT,     groupName: 'companyinformation', required: true,  unique: false, indexed: true,  isSystem: true, displayOrder: 1, hidden: false },
      { name: 'domain',         label: 'Company Domain',  type: PropertyType.URL,      groupName: 'companyinformation', required: false, unique: true,  indexed: true,  isSystem: true, displayOrder: 2, hidden: false },
      { name: 'owner_id',       label: 'Company Owner',   type: PropertyType.TEXT,     groupName: 'companyinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 3, hidden: false },
      { name: 'phone',          label: 'Phone Number',    type: PropertyType.PHONE,    groupName: 'companyinformation', required: false, unique: false, indexed: false, isSystem: true, displayOrder: 4, hidden: false },
      { name: 'city',           label: 'City',            type: PropertyType.TEXT,     groupName: 'companyinformation', required: false, unique: false, indexed: false, isSystem: true, displayOrder: 5, hidden: false },
      { name: 'industry',       label: 'Industry',        type: PropertyType.ENUM,     groupName: 'companyinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 6, hidden: false, options: [] },
      { name: 'lead_status',    label: 'Lead Status',     type: PropertyType.ENUM,     groupName: 'companyinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 7, hidden: false, options: [] },
      { name: 'create_date',    label: 'Create Date',     type: PropertyType.DATETIME, groupName: 'companyinformation', required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 8, hidden: false },
      { name: 'last_activity',  label: 'Last Activity',   type: PropertyType.DATETIME, groupName: 'companyactivity',    required: false, unique: false, indexed: true,  isSystem: true, displayOrder: 1, hidden: false },
    ];

    companyProps.forEach((p) => properties.set(p.name, p));

    const now = new Date();
    return new ObjectDefinition(UniqueId.create(), tenantId, {
      name: 'companies',
      label: 'Company',
      labelPlural: 'Companies',
      type: ObjectType.COMPANY,
      primaryDisplayProperty: 'name',
      secondaryDisplayProperties: ['domain', 'phone', 'city'],
      searchableProperties: ['name', 'domain', 'phone', 'city'],
      properties,
      propertyGroups: [
        { name: 'companyinformation', label: 'Company Information', displayOrder: 1, properties: ['name', 'domain', 'owner_id', 'phone', 'city', 'industry', 'lead_status', 'create_date'] },
        { name: 'companyactivity',    label: 'Company Activity',    displayOrder: 2, properties: ['last_activity'] },
      ],
      requiredProperties: ['name'],
      createdAt: now,
      updatedAt: now,
    });
  }

  addProperty(property: PropertyDefinition): Result<void> {
    if (this.props.properties.has(property.name)) {
      return Result.fail(`Property "${property.name}" already exists on ${this.props.name}`);
    }
    this.props.properties.set(property.name, property);
    this.props.updatedAt = new Date();
    return Result.ok(undefined);
  }

  getProperty(name: string): PropertyDefinition | undefined {
    return this.props.properties.get(name);
  }

  get name(): string { return this.props.name; }
  get label(): string { return this.props.label; }
  get objectType(): ObjectType { return this.props.type; }
  get properties(): ReadonlyMap<string, PropertyDefinition> { return this.props.properties; }
  get propertyGroups(): ReadonlyArray<PropertyGroup> { return this.props.propertyGroups; }
  get primaryDisplayProperty(): string { return this.props.primaryDisplayProperty; }
  get searchableProperties(): ReadonlyArray<string> { return this.props.searchableProperties; }
}
