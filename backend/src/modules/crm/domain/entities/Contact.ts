import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';
import { Email } from '../value-objects/Email';
import { PhoneNumber } from '../value-objects/PhoneNumber';

interface ContactProps {
  firstName: string;
  lastName: string;
  email: Email;
  phone?: PhoneNumber;
  companyName?: string;
  source: ContactSource;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum ContactSource {
  MANUAL = 'MANUAL',
  EMAIL_SYNC = 'EMAIL_SYNC',
  WEB_FORM = 'WEB_FORM',
  API_IMPORT = 'API_IMPORT',
}

export enum ContactStatus {
  ACTIVE = 'ACTIVE',
  MERGED = 'MERGED',
  ARCHIVED = 'ARCHIVED',
}

export class Contact extends AggregateRoot<ContactProps> {
  private constructor(id: UniqueId, tenantId: string, props: ContactProps) {
    super(id, tenantId, props);
  }

  static create(
    tenantId: string,
    firstName: string,
    lastName: string,
    email: Email,
    source: ContactSource,
    phone?: PhoneNumber,
    companyName?: string,
  ): Result<Contact> {
    if (!firstName || firstName.trim().length < 1) {
      return Result.fail('First name is required');
    }
    if (!lastName || lastName.trim().length < 1) {
      return Result.fail('Last name is required');
    }

    const now = new Date();
    const contact = new Contact(UniqueId.create(), tenantId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      phone,
      companyName: companyName?.trim(),
      source,
      status: ContactStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    return Result.ok(contact);
  }

  get firstName(): string { return this.props.firstName; }
  get lastName(): string { return this.props.lastName; }
  get fullName(): string { return `${this.props.firstName} ${this.props.lastName}`; }
  get email(): Email { return this.props.email; }
  get phone(): PhoneNumber | undefined { return this.props.phone; }
  get companyName(): string | undefined { return this.props.companyName; }
  get status(): ContactStatus { return this.props.status; }

  markAsMerged(): void {
    this.props.status = ContactStatus.MERGED;
    this.props.updatedAt = new Date();
  }
}
