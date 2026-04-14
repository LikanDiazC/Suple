import { Entity, UniqueId, Result } from '../../../../shared/kernel';

/**
 * ==========================================================================
 * CRM Association (N:M Relationship with Labels)
 * ==========================================================================
 *
 * Models the relationship between any two CRM records across object types.
 * This is the backbone of HubSpot's "Associations" system:
 *
 *   Contact <-> Company     (Employee, Board Member, Consultant)
 *   Contact <-> Deal        (Decision Maker, Budget Holder)
 *   Company <-> Deal        (Primary Company, Partner)
 *   Deal    <-> Ticket      (Related Ticket)
 *   Any     <-> Custom Obj  (User-defined)
 *
 * Architecture:
 *   - Association Definitions: Define WHICH object types can relate.
 *   - Association Instances:   The actual link between two records.
 *   - Labels:                  Optional semantic labels on associations.
 *
 * The junction table pattern uses:
 *   (tenant_id, from_record_id, to_record_id, definition_id) as PK
 *   with a JSONB `labels` column for the label set.
 *
 * This is bidirectional: creating Contact->Company also creates
 * Company->Contact (with inverse label). Deletion cascades both ways.
 * ==========================================================================
 */

export enum AssociationCategory {
  HUBSPOT_DEFINED = 'HUBSPOT_DEFINED',   // System-default associations
  USER_DEFINED = 'USER_DEFINED',         // Custom associations
  INTEGRATOR_DEFINED = 'INTEGRATOR_DEFINED',
}

/**
 * Defines which object types can be associated and with what labels.
 */
export interface AssociationDefinition {
  id: string;
  fromObjectType: string;     // e.g., "contacts"
  toObjectType: string;       // e.g., "companies"
  category: AssociationCategory;
  labels: AssociationLabel[];
}

export interface AssociationLabel {
  labelId: number;
  label: string;          // e.g., "Primary", "Employee", "Board Member"
  inverseLabel: string;   // e.g., "Employer", "Employee's Company"
}

// Default system association definitions
export const SYSTEM_ASSOCIATIONS: Omit<AssociationDefinition, 'id'>[] = [
  {
    fromObjectType: 'contacts',
    toObjectType: 'companies',
    category: AssociationCategory.HUBSPOT_DEFINED,
    labels: [
      { labelId: 1,  label: 'Primary',       inverseLabel: 'Primary Contact' },
      { labelId: 2,  label: 'Employee',       inverseLabel: 'Employer' },
      { labelId: 3,  label: 'Board Member',   inverseLabel: 'Board Member of' },
      { labelId: 4,  label: 'Consultant',     inverseLabel: 'Client' },
    ],
  },
  {
    fromObjectType: 'contacts',
    toObjectType: 'deals',
    category: AssociationCategory.HUBSPOT_DEFINED,
    labels: [
      { labelId: 10, label: 'Decision Maker', inverseLabel: 'Deal Contact (Decision Maker)' },
      { labelId: 11, label: 'Budget Holder',  inverseLabel: 'Deal Contact (Budget Holder)' },
      { labelId: 12, label: 'Champion',       inverseLabel: 'Deal Contact (Champion)' },
    ],
  },
  {
    fromObjectType: 'companies',
    toObjectType: 'deals',
    category: AssociationCategory.HUBSPOT_DEFINED,
    labels: [
      { labelId: 20, label: 'Primary Company', inverseLabel: 'Company Deal' },
      { labelId: 21, label: 'Partner',          inverseLabel: 'Partner Deal' },
    ],
  },
  {
    fromObjectType: 'deals',
    toObjectType: 'tickets',
    category: AssociationCategory.HUBSPOT_DEFINED,
    labels: [
      { labelId: 30, label: 'Related Ticket', inverseLabel: 'Related Deal' },
    ],
  },
  {
    fromObjectType: 'contacts',
    toObjectType: 'tickets',
    category: AssociationCategory.HUBSPOT_DEFINED,
    labels: [
      { labelId: 40, label: 'Ticket Contact', inverseLabel: 'Contact Ticket' },
    ],
  },
];

/**
 * An actual association instance between two CRM records.
 */
interface AssociationInstanceProps {
  definitionId: string;
  fromObjectType: string;
  fromRecordId: string;
  toObjectType: string;
  toRecordId: string;
  labelIds: number[];       // Applied labels from the definition
  createdAt: Date;
  createdBy: string;
}

export class AssociationInstance extends Entity<AssociationInstanceProps> {
  private constructor(id: UniqueId, tenantId: string, props: AssociationInstanceProps) {
    super(id, tenantId, props);
  }

  static create(
    tenantId: string,
    definitionId: string,
    fromObjectType: string,
    fromRecordId: string,
    toObjectType: string,
    toRecordId: string,
    labelIds: number[],
    createdBy: string,
  ): Result<AssociationInstance> {
    if (fromRecordId === toRecordId && fromObjectType === toObjectType) {
      return Result.fail('A record cannot be associated with itself');
    }

    return Result.ok(new AssociationInstance(UniqueId.create(), tenantId, {
      definitionId,
      fromObjectType,
      fromRecordId,
      toObjectType,
      toRecordId,
      labelIds,
      createdAt: new Date(),
      createdBy,
    }));
  }

  addLabel(labelId: number): void {
    if (!this.props.labelIds.includes(labelId)) {
      this.props.labelIds.push(labelId);
    }
  }

  removeLabel(labelId: number): void {
    this.props.labelIds = this.props.labelIds.filter((id) => id !== labelId);
  }

  get fromRecordId(): string { return this.props.fromRecordId; }
  get toRecordId(): string { return this.props.toRecordId; }
  get fromObjectType(): string { return this.props.fromObjectType; }
  get toObjectType(): string { return this.props.toObjectType; }
  get labelIds(): ReadonlyArray<number> { return this.props.labelIds; }
}
