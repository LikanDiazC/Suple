import { CrmRecord } from '../entities/CrmRecord';

/**
 * ==========================================================================
 * CRM Record Repository Port (Hexagonal Architecture)
 * ==========================================================================
 *
 * Defines the persistence contract for CRM records (contacts, companies,
 * deals, tickets, and custom objects).
 *
 * The implementation may use:
 *   - PostgreSQL with hybrid JSONB + indexed columns (production)
 *   - In-memory Map (development/testing)
 *
 * All queries are tenant-scoped by default.
 * ==========================================================================
 */

export const CRM_RECORD_REPOSITORY = Symbol('CRM_RECORD_REPOSITORY');

export interface CrmRecordListQuery {
  tenantId: string;
  objectType: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, string>;
  /** Filter to only these record IDs (for "Mis contactos" tab) */
  ids?: string[];
}

export interface CrmRecordListResult {
  records: CrmRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ICrmRecordRepository {
  /** Find a single record by ID within a tenant */
  findById(tenantId: string, recordId: string): Promise<CrmRecord | null>;

  /** Find record by exact email (contacts) */
  findByEmail(tenantId: string, email: string): Promise<CrmRecord | null>;

  /** Find record by exact domain (companies) */
  findByDomain(tenantId: string, domain: string): Promise<CrmRecord | null>;

  /** List records with pagination, search, sort, and filters */
  list(query: CrmRecordListQuery): Promise<CrmRecordListResult>;

  /** Persist a new or updated record */
  save(record: CrmRecord): Promise<void>;

  /** Soft-delete (archive) a record */
  archive(tenantId: string, recordId: string): Promise<void>;

  /** Hard-delete a record (admin only) */
  delete(tenantId: string, recordId: string): Promise<void>;

  /**
   * Find all active contacts whose email ends with `@{domain}`.
   * Used for label propagation from a company to its contacts.
   */
  findContactsByEmailDomain(tenantId: string, domain: string): Promise<CrmRecord[]>;

  /**
   * AUDIT FIX #3: Optimized candidate pre-filtering for dedup.
   *
   * Instead of returning ALL records (which blocks the Event Loop at scale),
   * this method now accepts structured hints so the implementation can
   * leverage database-level filtering (e.g. pg_trgm trigram index).
   *
   * The repository returns a SMALL batch of "probable candidates"
   * (typically <50 records), which are then scored in-memory by the
   * EntityResolutionService. This reduces O(N) full-table scans to
   * O(k) where k << N.
   *
   * @param hints  Structured search hints from the incoming record.
   * @param maxCandidates  Maximum candidates to return (default 50).
   */
  findCandidatesForDedup(
    tenantId: string,
    objectType: string,
    email?: string,
    domain?: string,
    hints?: DedupSearchHints,
    maxCandidates?: number,
  ): Promise<CrmRecord[]>;
}

/**
 * Structured hints for candidate pre-filtering.
 * Each field allows the repository to use indexed queries
 * (trigram similarity, exact match, domain match) to narrow
 * the candidate set before expensive in-memory comparison.
 */
export interface DedupSearchHints {
  /** First name for trigram similarity search */
  firstName?: string;
  /** Last name for trigram similarity search */
  lastName?: string;
  /** Full email for exact/domain match */
  email?: string;
  /** Normalized phone digits for suffix match */
  phoneDigits?: string;
  /** Company name for trigram similarity */
  companyName?: string;
  /** Minimum trigram similarity threshold (0-1, default 0.3) */
  similarityThreshold?: number;
}
