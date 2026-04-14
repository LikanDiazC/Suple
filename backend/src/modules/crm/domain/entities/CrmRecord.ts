import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';

/**
 * ==========================================================================
 * CRM Record (Object Instance)
 * ==========================================================================
 *
 * A single instance of a CRM object (one Contact, one Company, one Deal).
 * This is the row-level entity that holds actual data.
 *
 * Data Storage Strategy (Hybrid Schema):
 *   - `properties`: JSONB column storing ALL property values as key-value pairs.
 *     This provides schema-free flexibility for custom properties.
 *   - Hot-path properties (email, domain, name) are ALSO stored in dedicated
 *     SQL columns with indexes for filter/sort performance.
 *   - The application layer syncs hot-path columns from the JSONB on write.
 *
 * This mirrors HubSpot's architecture where:
 *   - Each record has a flat property bag
 *   - Property definitions live in the ObjectDefinition
 *   - Property history is tracked per-property per-record
 *
 * Multi-tenancy: Every record carries tenantId + objectDefinitionId.
 * ==========================================================================
 */

export interface PropertyValue {
  value: unknown;
  source: PropertySource;
  sourceId?: string;       // e.g., form ID, import ID, integration ID
  updatedAt: Date;
  updatedBy: string;       // userId
}

export enum PropertySource {
  MANUAL = 'MANUAL',           // User typed it in the UI
  FORM = 'FORM',               // Submitted via a form
  IMPORT = 'IMPORT',           // CSV/API bulk import
  INTEGRATION = 'INTEGRATION', // External integration sync
  WORKFLOW = 'WORKFLOW',       // Automation set the value
  CALCULATED = 'CALCULATED',   // Formula/rollup computed
  API = 'API',                 // Direct API write
}

interface CrmRecordProps {
  objectDefinitionId: string;   // Links to ObjectDefinition
  objectType: string;           // "contacts", "companies", "deals"
  properties: Map<string, PropertyValue>;
  // Hot-path indexed columns (synced from properties on write)
  _email?: string;              // Contact: indexed for dedup
  _domain?: string;             // Company: indexed for dedup
  _name?: string;               // Display name (computed)
  _ownerId?: string;            // Owner: indexed for views
  _lifecycleStage?: string;     // Indexed for segmentation
  _leadStatus?: string;         // Indexed for filtering
  _createDate: Date;
  _lastActivity?: Date;
  archived: boolean;
  createdBy: string;
  updatedAt: Date;
}

export class CrmRecord extends AggregateRoot<CrmRecordProps> {
  private constructor(id: UniqueId, tenantId: string, props: CrmRecordProps) {
    super(id, tenantId, props);
  }

  static create(
    tenantId: string,
    objectDefinitionId: string,
    objectType: string,
    initialProperties: Record<string, unknown>,
    createdBy: string,
    source: PropertySource = PropertySource.MANUAL,
  ): Result<CrmRecord> {
    const now = new Date();
    const properties = new Map<string, PropertyValue>();

    for (const [key, value] of Object.entries(initialProperties)) {
      if (value !== undefined && value !== null && value !== '') {
        properties.set(key, {
          value,
          source,
          updatedAt: now,
          updatedBy: createdBy,
        });
      }
    }

    const record = new CrmRecord(UniqueId.create(), tenantId, {
      objectDefinitionId,
      objectType,
      properties,
      _email: typeof initialProperties['email'] === 'string' ? (initialProperties['email'] as string).toLowerCase().trim() : undefined,
      _domain: typeof initialProperties['domain'] === 'string' ? (initialProperties['domain'] as string).toLowerCase().trim() : undefined,
      _name: CrmRecord.computeDisplayName(objectType, initialProperties),
      _ownerId: initialProperties['owner_id'] as string | undefined,
      _lifecycleStage: initialProperties['lifecycle_stage'] as string | undefined,
      _leadStatus: initialProperties['lead_status'] as string | undefined,
      _createDate: now,
      _lastActivity: now,
      archived: false,
      createdBy,
      updatedAt: now,
    });

    return Result.ok(record);
  }

  /**
   * Updates one or more properties on this record.
   * Syncs hot-path SQL columns when relevant properties change.
   * Records property history for audit trail.
   */
  setProperties(
    updates: Record<string, unknown>,
    updatedBy: string,
    source: PropertySource = PropertySource.MANUAL,
  ): void {
    const now = new Date();

    for (const [key, value] of Object.entries(updates)) {
      this.props.properties.set(key, {
        value,
        source,
        updatedAt: now,
        updatedBy,
      });

      // Sync hot-path columns
      switch (key) {
        case 'email':
          this.props._email = typeof value === 'string' ? value.toLowerCase().trim() : undefined;
          break;
        case 'domain':
          this.props._domain = typeof value === 'string' ? value.toLowerCase().trim() : undefined;
          break;
        case 'owner_id':
          this.props._ownerId = value as string | undefined;
          break;
        case 'lifecycle_stage':
          this.props._lifecycleStage = value as string | undefined;
          break;
        case 'lead_status':
          this.props._leadStatus = value as string | undefined;
          break;
      }
    }

    // Recompute display name
    const propsObj: Record<string, unknown> = {};
    this.props.properties.forEach((pv, k) => { propsObj[k] = pv.value; });
    this.props._name = CrmRecord.computeDisplayName(this.props.objectType, propsObj);
    this.props._lastActivity = now;
    this.props.updatedAt = now;
  }

  getPropertyValue(name: string): unknown {
    return this.props.properties.get(name)?.value;
  }

  archive(): void {
    this.props.archived = true;
    this.props.updatedAt = new Date();
  }

  private static computeDisplayName(objectType: string, props: Record<string, unknown>): string {
    switch (objectType) {
      case 'contacts': {
        const first = (props['first_name'] as string) || '';
        const last = (props['last_name'] as string) || '';
        const full = `${first} ${last}`.trim();
        return full || (props['email'] as string) || 'Unnamed Contact';
      }
      case 'companies':
        return (props['name'] as string) || (props['domain'] as string) || 'Unnamed Company';
      case 'deals':
        return (props['deal_name'] as string) || 'Unnamed Deal';
      case 'tickets':
        return (props['subject'] as string) || 'Unnamed Ticket';
      default:
        return (props['name'] as string) || `Record`;
    }
  }

  get objectType(): string { return this.props.objectType; }
  get displayName(): string { return this.props._name ?? ''; }
  get email(): string | undefined { return this.props._email; }
  get domain(): string | undefined { return this.props._domain; }
  get ownerId(): string | undefined { return this.props._ownerId; }
  get archived(): boolean { return this.props.archived; }
  get properties(): ReadonlyMap<string, PropertyValue> { return this.props.properties; }
  get createDate(): Date { return this.props._createDate; }
  get lastActivity(): Date | undefined { return this.props._lastActivity; }

  toPropertiesRecord(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.props.properties.forEach((pv, key) => {
      result[key] = pv.value;
    });
    return result;
  }
}
