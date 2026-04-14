import { Contact } from '../entities/Contact';
import { EntityCandidate } from '../services/EntityResolutionService';

/**
 * Repository port (interface) for the Contact aggregate.
 * Defined in the domain layer, implemented in the infrastructure layer.
 * This inversion of control is the core of Clean Architecture's Dependency Rule.
 */
export interface IContactRepository {
  findById(tenantId: string, id: string): Promise<Contact | null>;
  findByEmail(tenantId: string, email: string): Promise<Contact | null>;
  save(contact: Contact): Promise<void>;

  /**
   * Returns lightweight candidate records for entity resolution.
   * Pre-filters by tenant and optionally by trigram similarity on name/email
   * to reduce the comparison set before running pairwise algorithms.
   */
  findCandidatesForResolution(
    tenantId: string,
    firstName: string,
    lastName: string,
    emailDomain: string,
  ): Promise<EntityCandidate[]>;
}

export const CONTACT_REPOSITORY = Symbol('IContactRepository');
