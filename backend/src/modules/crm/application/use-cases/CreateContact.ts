import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import { Contact, ContactSource } from '../../domain/entities/Contact';
import { Email } from '../../domain/value-objects/Email';
import { PhoneNumber } from '../../domain/value-objects/PhoneNumber';
import {
  EntityResolutionService,
  DuplicateVerdict,
} from '../../domain/services/EntityResolutionService';
import {
  IContactRepository,
  CONTACT_REPOSITORY,
} from '../../domain/repositories/IContactRepository';
import {
  CreateContactDto,
  CreateContactResultDto,
  DuplicateWarningDto,
} from '../dtos/ContactDto';

/**
 * ==========================================================================
 * Use Case: Create Contact with Real-Time Duplicate Detection
 * ==========================================================================
 *
 * Application-layer orchestrator that:
 *   1. Validates and constructs domain value objects from the DTO.
 *   2. Retrieves resolution candidates from the repository (pre-filtered).
 *   3. Runs the Entity Resolution Service pipeline.
 *   4. Blocks creation if a DUPLICATE_CONFIRMED is found.
 *   5. Creates with warnings if DUPLICATE_PROBABLE matches exist.
 *   6. Persists the aggregate and flushes domain events.
 *
 * This use case enforces the business invariant:
 *   "No two contacts within the same tenant may represent the same
 *    real-world entity with a confidence >= 90%."
 * ==========================================================================
 */
@Injectable()
export class CreateContactUseCase {
  private readonly resolutionService = new EntityResolutionService();

  constructor(
    @Inject(CONTACT_REPOSITORY)
    private readonly contactRepo: IContactRepository,
  ) {}

  async execute(
    tenantId: string,
    dto: CreateContactDto,
  ): Promise<Result<CreateContactResultDto>> {
    // --- Step 1: Construct Value Objects ---
    const emailResult = Email.create(dto.email);
    if (emailResult.isFail()) {
      return Result.fail(emailResult.error);
    }

    let phone: PhoneNumber | undefined;
    if (dto.phoneCountryCode && dto.phoneNumber) {
      const phoneResult = PhoneNumber.create(dto.phoneCountryCode, dto.phoneNumber);
      if (phoneResult.isFail()) {
        return Result.fail(phoneResult.error);
      }
      phone = phoneResult.value;
    }

    // --- Step 2: Retrieve Candidates for Resolution ---
    const emailDomain = emailResult.value.domain;
    const candidates = await this.contactRepo.findCandidatesForResolution(
      tenantId,
      dto.firstName,
      dto.lastName,
      emailDomain,
    );

    // --- Step 3: Run Entity Resolution Pipeline ---
    const incoming = {
      id: '', // New record has no ID yet
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: phone?.canonical,
      companyName: dto.companyName,
    };

    const matches = this.resolutionService.resolve(incoming, candidates);

    // --- Step 4: Evaluate Resolution Verdict ---
    const confirmedDuplicate = matches.find(
      (m) => m.verdict === DuplicateVerdict.DUPLICATE_CONFIRMED,
    );

    const duplicateWarnings: DuplicateWarningDto[] = matches.map((m) => ({
      matchedContactId: m.candidateId,
      confidence: m.confidence,
      verdict: m.verdict,
      nameScore: m.breakdown.nameScore,
      emailScore: m.breakdown.emailScore,
      phoneScore: m.breakdown.phoneScore,
      companyScore: m.breakdown.companyScore,
    }));

    if (confirmedDuplicate) {
      return Result.ok({
        contact: undefined,
        duplicates: duplicateWarnings,
        blocked: true,
      });
    }

    // --- Step 5: Create and Persist Contact ---
    const source = this.mapSource(dto.source);
    const contactResult = Contact.create(
      tenantId,
      dto.firstName,
      dto.lastName,
      emailResult.value,
      source,
      phone,
      dto.companyName,
    );

    if (contactResult.isFail()) {
      return Result.fail(contactResult.error);
    }

    const contact = contactResult.value;
    await this.contactRepo.save(contact);

    return Result.ok({
      contact: {
        id: contact.id.toString(),
        tenantId: contact.tenantId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email.value,
        phone: contact.phone?.canonical,
        companyName: contact.companyName,
        status: contact.status,
      },
      duplicates: duplicateWarnings,
      blocked: false,
    });
  }

  private mapSource(source: string): ContactSource {
    const map: Record<string, ContactSource> = {
      manual: ContactSource.MANUAL,
      email_sync: ContactSource.EMAIL_SYNC,
      web_form: ContactSource.WEB_FORM,
      api_import: ContactSource.API_IMPORT,
    };
    return map[source.toLowerCase()] ?? ContactSource.MANUAL;
  }
}
