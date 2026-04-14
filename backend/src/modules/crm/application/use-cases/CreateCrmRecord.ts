import { Injectable, Inject } from '@nestjs/common';
import { Result } from '../../../../shared/kernel';
import {
  ICrmRecordRepository,
  CRM_RECORD_REPOSITORY,
} from '../../domain/repositories/ICrmRecordRepository';
import { CrmRecord, PropertySource } from '../../domain/entities/CrmRecord';
import {
  DeduplicationService,
  ExistingRecord,
} from '../../domain/services/DeduplicationService';
import {
  CreateCrmRecordDto,
  CreateCrmRecordResultDto,
  mapRecordToDto,
} from '../dtos/CrmRecordDto';

/**
 * ==========================================================================
 * Create CRM Record Use Case
 * ==========================================================================
 *
 * Orchestrates record creation with:
 *   1. Duplicate detection (email for contacts, domain for companies)
 *   2. Auto-association (contact email domain → company domain)
 *   3. Record persistence
 *
 * If an exact duplicate is found, creation is BLOCKED.
 * If probable duplicates are found, creation proceeds with warnings.
 * ==========================================================================
 */
@Injectable()
export class CreateCrmRecordUseCase {
  private readonly dedupService = new DeduplicationService();

  constructor(
    @Inject(CRM_RECORD_REPOSITORY)
    private readonly repo: ICrmRecordRepository,
  ) {}

  async execute(
    tenantId: string,
    dto: CreateCrmRecordDto,
    createdBy: string,
  ): Promise<Result<CreateCrmRecordResultDto>> {
    const result: CreateCrmRecordResultDto = {
      duplicates: [],
      autoAssociations: [],
      blocked: false,
    };

    // --- Deduplication Check ---
    // AUDIT FIX #3: Pass structured hints so the repository can use
    // pg_trgm indexed queries instead of loading ALL records into memory.
    if (dto.objectType === 'contacts' && dto.properties['email']) {
      const email = String(dto.properties['email']);
      const firstName = dto.properties['first_name'] as string | undefined;
      const lastName = dto.properties['last_name'] as string | undefined;
      const phone = dto.properties['phone'] as string | undefined;
      const emailDomain = email.split('@')[1];

      const candidates = await this.repo.findCandidatesForDedup(
        tenantId, 'contacts', email, undefined,
        { email, firstName, lastName, phoneDigits: phone?.replace(/\D/g, '') },
        50, // max 50 candidates
      );

      const companies = await this.repo.findCandidatesForDedup(
        tenantId, 'companies', undefined, emailDomain,
        { companyName: emailDomain },
        20, // fewer candidates needed for company association
      );

      const existingContacts: ExistingRecord[] = candidates.map((c) => ({
        id: c.id.toString(),
        objectType: 'contacts',
        displayName: c.displayName,
        email: c.email,
        firstName: c.getPropertyValue('first_name') as string | undefined,
        lastName: c.getPropertyValue('last_name') as string | undefined,
        phone: c.getPropertyValue('phone') as string | undefined,
      }));

      const existingCompanies: ExistingRecord[] = companies.map((c) => ({
        id: c.id.toString(),
        objectType: 'companies',
        displayName: c.displayName,
        domain: c.domain,
      }));

      const dedupResult = this.dedupService.deduplicateContact(
        {
          email,
          firstName: dto.properties['first_name'] as string | undefined,
          lastName: dto.properties['last_name'] as string | undefined,
          phone: dto.properties['phone'] as string | undefined,
        },
        existingContacts,
        existingCompanies,
      );

      if (dedupResult.exactMatch) {
        result.blocked = true;
        result.duplicates = [{
          recordId: dedupResult.exactMatch.recordId,
          displayName: `Exact match on ${dedupResult.exactMatch.matchField}`,
          confidence: 1.0,
          verdict: 'EXACT_MATCH',
          matchReasons: [`${dedupResult.exactMatch.matchField}: ${dedupResult.exactMatch.matchValue}`],
        }];
        return Result.ok(result);
      }

      result.duplicates = dedupResult.probableMatches.map((m) => ({
        recordId: m.recordId,
        displayName: m.displayName,
        confidence: m.confidence,
        verdict: m.verdict,
        matchReasons: m.matchReasons,
      }));

      result.autoAssociations = dedupResult.autoAssociations.map((a) => ({
        companyId: a.companyRecordId,
        companyName: a.companyName,
        domain: a.matchedDomain,
        reason: a.reason,
      }));

      if (dedupResult.hasDuplicate) {
        result.blocked = true;
        return Result.ok(result);
      }
    }

    if (dto.objectType === 'companies' && dto.properties['domain']) {
      const domain = String(dto.properties['domain']);
      // AUDIT FIX #3: Hint-based filtering for company dedup
      const candidates = await this.repo.findCandidatesForDedup(
        tenantId, 'companies', undefined, domain,
        { companyName: dto.properties['name'] as string | undefined },
        30,
      );

      const existingCompanies: ExistingRecord[] = candidates.map((c) => ({
        id: c.id.toString(),
        objectType: 'companies',
        displayName: c.displayName,
        domain: c.domain,
        companyName: c.displayName,
      }));

      const dedupResult = this.dedupService.deduplicateCompany(
        { name: String(dto.properties['name'] ?? ''), domain },
        existingCompanies,
      );

      if (dedupResult.hasDuplicate) {
        result.blocked = true;
        result.duplicates = dedupResult.exactMatch
          ? [{
              recordId: dedupResult.exactMatch.recordId,
              displayName: `Exact match on ${dedupResult.exactMatch.matchField}`,
              confidence: 1.0,
              verdict: 'EXACT_MATCH',
              matchReasons: [`${dedupResult.exactMatch.matchField}: ${dedupResult.exactMatch.matchValue}`],
            }]
          : dedupResult.probableMatches.map((m) => ({
              recordId: m.recordId,
              displayName: m.displayName,
              confidence: m.confidence,
              verdict: m.verdict,
              matchReasons: m.matchReasons,
            }));
        return Result.ok(result);
      }
    }

    // --- Create Record ---
    const recordResult = CrmRecord.create(
      tenantId,
      `def_${dto.objectType}_std`,
      dto.objectType,
      dto.properties,
      createdBy,
      PropertySource.API,
    );

    if (recordResult.isFail()) {
      return Result.fail(recordResult.error);
    }

    await this.repo.save(recordResult.value);

    result.record = mapRecordToDto(recordResult.value);
    return Result.ok(result);
  }
}
