import { DomainEvent } from '../../../../shared/kernel';
import { DuplicateVerdict } from '../services/EntityResolutionService';

export class DuplicateDetectedEvent extends DomainEvent {
  constructor(
    tenantId: string,
    public readonly incomingContactId: string,
    public readonly matchedContactId: string,
    public readonly confidence: number,
    public readonly verdict: DuplicateVerdict,
  ) {
    super(tenantId);
  }

  get eventName(): string {
    return 'crm.contact.duplicate_detected';
  }
}
