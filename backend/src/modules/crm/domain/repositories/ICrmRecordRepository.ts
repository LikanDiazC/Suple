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

  /** Find candidate records for dedup (by objectType within tenant) */
  findCandidatesForDedup(
    tenantId: string,
    objectType: string,
    email?: string,
    domain?: string,
  ): Promise<CrmRecord[]>;
}
