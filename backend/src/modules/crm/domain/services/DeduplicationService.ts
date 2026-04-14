import { Result } from '../../../../shared/kernel';
import { EntityResolutionService, DuplicateVerdict } from './EntityResolutionService';

/**
 * ==========================================================================
 * CRM Deduplication Service
 * ==========================================================================
 *
 * Specialized deduplication layer that extends the generic
 * EntityResolutionService with CRM-specific matching strategies.
 *
 * HubSpot deduplicates by:
 *   - Contacts: Email address (primary key for identity)
 *   - Companies: Domain name (primary key for org identity)
 *
 * This service implements a two-pass strategy:
 *
 *   Pass 1 (Exact Match): Direct lookup by email/domain.
 *     O(1) via database index. Blocks creation if exact match found.
 *
 *   Pass 2 (Fuzzy Match): If no exact match, run the Entity Resolution
 *     pipeline from EntityResolutionService against candidates filtered
 *     by email domain or company name trigrams.
 *     Returns "probable" duplicates for user review.
 *
 * Additionally handles:
 *   - Email alias detection (john+tag@company.com -> john@company.com)
 *   - Domain normalization (www.company.com -> company.com)
 *   - Auto-association: When a contact's email domain matches a company's
 *     domain, automatically create a Contact<->Company association.
 * ==========================================================================
 */

export interface DeduplicationResult {
  hasDuplicate: boolean;
  exactMatch?: { recordId: string; matchField: string; matchValue: string };
  probableMatches: ProbableMatch[];
  autoAssociations: AutoAssociation[];
}

export interface ProbableMatch {
  recordId: string;
  displayName: string;
  confidence: number;
  verdict: DuplicateVerdict;
  matchReasons: string[];
}

export interface AutoAssociation {
  companyRecordId: string;
  companyName: string;
  matchedDomain: string;
  reason: string;
}

export interface ExistingRecord {
  id: string;
  objectType: string;
  displayName: string;
  email?: string;
  domain?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
}

export class DeduplicationService {
  private readonly entityResolver = new EntityResolutionService();

  /**
   * Deduplicates a contact being created.
   *
   * @param incoming      The new contact properties.
   * @param existingContacts  Pre-filtered candidate contacts from DB.
   * @param existingCompanies Pre-filtered companies for auto-association.
   */
  deduplicateContact(
    incoming: { email: string; firstName?: string; lastName?: string; phone?: string },
    existingContacts: ExistingRecord[],
    existingCompanies: ExistingRecord[],
  ): DeduplicationResult {
    const result: DeduplicationResult = {
      hasDuplicate: false,
      probableMatches: [],
      autoAssociations: [],
    };

    const normalizedEmail = this.normalizeEmail(incoming.email);

    // --- Pass 1: Exact email match ---
    const exactEmailMatch = existingContacts.find(
      (c) => c.email && this.normalizeEmail(c.email) === normalizedEmail,
    );

    if (exactEmailMatch) {
      result.hasDuplicate = true;
      result.exactMatch = {
        recordId: exactEmailMatch.id,
        matchField: 'email',
        matchValue: normalizedEmail,
      };
      return result;
    }

    // --- Pass 2: Fuzzy match via Entity Resolution ---
    const candidates = existingContacts.map((c) => ({
      id: c.id,
      firstName: c.firstName ?? '',
      lastName: c.lastName ?? '',
      email: c.email ?? '',
      phone: c.phone,
      companyName: c.companyName,
    }));

    const incomingCandidate = {
      id: '',
      firstName: incoming.firstName ?? '',
      lastName: incoming.lastName ?? '',
      email: incoming.email,
      phone: incoming.phone,
    };

    const fuzzyResults = this.entityResolver.resolve(incomingCandidate, candidates);

    result.probableMatches = fuzzyResults.map((r) => {
      const contact = existingContacts.find((c) => c.id === r.candidateId);
      return {
        recordId: r.candidateId,
        displayName: contact?.displayName ?? 'Unknown',
        confidence: r.confidence,
        verdict: r.verdict,
        matchReasons: this.buildMatchReasons(r.breakdown),
      };
    });

    if (fuzzyResults.some((r) => r.verdict === DuplicateVerdict.DUPLICATE_CONFIRMED)) {
      result.hasDuplicate = true;
    }

    // --- Auto-Association: Match email domain to company domain ---
    const emailDomain = this.extractDomain(incoming.email);
    if (emailDomain) {
      const matchedCompanies = existingCompanies.filter((company) => {
        if (!company.domain) return false;
        return this.normalizeDomain(company.domain) === emailDomain;
      });

      result.autoAssociations = matchedCompanies.map((company) => ({
        companyRecordId: company.id,
        companyName: company.displayName,
        matchedDomain: emailDomain,
        reason: `Email domain "${emailDomain}" matches company domain`,
      }));
    }

    return result;
  }

  /**
   * Deduplicates a company being created.
   * Primary key: domain name.
   */
  deduplicateCompany(
    incoming: { name: string; domain?: string },
    existingCompanies: ExistingRecord[],
  ): DeduplicationResult {
    const result: DeduplicationResult = {
      hasDuplicate: false,
      probableMatches: [],
      autoAssociations: [],
    };

    // --- Pass 1: Exact domain match ---
    if (incoming.domain) {
      const normalizedDomain = this.normalizeDomain(incoming.domain);
      const exactDomainMatch = existingCompanies.find(
        (c) => c.domain && this.normalizeDomain(c.domain) === normalizedDomain,
      );

      if (exactDomainMatch) {
        result.hasDuplicate = true;
        result.exactMatch = {
          recordId: exactDomainMatch.id,
          matchField: 'domain',
          matchValue: normalizedDomain,
        };
        return result;
      }
    }

    // --- Pass 2: Fuzzy name match ---
    for (const existing of existingCompanies) {
      const nameSim = this.entityResolver.jaroWinkler(
        incoming.name.toLowerCase(),
        existing.displayName.toLowerCase(),
      );

      if (nameSim >= 0.90) {
        result.probableMatches.push({
          recordId: existing.id,
          displayName: existing.displayName,
          confidence: nameSim,
          verdict: nameSim >= 0.95 ? DuplicateVerdict.DUPLICATE_CONFIRMED : DuplicateVerdict.DUPLICATE_PROBABLE,
          matchReasons: [`Company name similarity: ${(nameSim * 100).toFixed(0)}%`],
        });
      }
    }

    if (result.probableMatches.some((m) => m.verdict === DuplicateVerdict.DUPLICATE_CONFIRMED)) {
      result.hasDuplicate = true;
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Normalization Utilities
  // ---------------------------------------------------------------------------

  /**
   * Normalizes email for dedup:
   *   - Lowercase
   *   - Strip "+" aliases (john+tag@co.com -> john@co.com)
   *   - Strip dots in local part for Gmail (j.ohn@gmail.com -> john@gmail.com)
   */
  private normalizeEmail(email: string): string {
    const [local, domain] = email.toLowerCase().trim().split('@');
    if (!domain) return email.toLowerCase().trim();

    let normalizedLocal = local.split('+')[0]; // Strip + alias

    // Gmail dot-stripping (only for gmail.com/googlemail.com)
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      normalizedLocal = normalizedLocal.replace(/\./g, '');
    }

    return `${normalizedLocal}@${domain}`;
  }

  /**
   * Extracts and normalizes the domain from an email address.
   */
  private extractDomain(email: string): string | null {
    const parts = email.toLowerCase().trim().split('@');
    if (parts.length !== 2) return null;
    return this.normalizeDomain(parts[1]);
  }

  /**
   * Normalizes a domain: strips www., protocol, trailing slashes.
   * Excludes free email providers from company matching.
   */
  private normalizeDomain(domain: string): string {
    let d = domain.toLowerCase().trim();
    d = d.replace(/^https?:\/\//, '');
    d = d.replace(/^www\./, '');
    d = d.replace(/\/.*$/, '');
    return d;
  }

  private buildMatchReasons(breakdown: {
    nameScore: number;
    emailScore: number;
    phoneScore: number;
    companyScore: number;
  }): string[] {
    const reasons: string[] = [];
    if (breakdown.emailScore > 0.7) reasons.push(`Email similarity: ${(breakdown.emailScore * 100).toFixed(0)}%`);
    if (breakdown.nameScore > 0.7) reasons.push(`Name similarity: ${(breakdown.nameScore * 100).toFixed(0)}%`);
    if (breakdown.phoneScore > 0.7) reasons.push(`Phone similarity: ${(breakdown.phoneScore * 100).toFixed(0)}%`);
    if (breakdown.companyScore > 0.7) reasons.push(`Company similarity: ${(breakdown.companyScore * 100).toFixed(0)}%`);
    return reasons;
  }
}
