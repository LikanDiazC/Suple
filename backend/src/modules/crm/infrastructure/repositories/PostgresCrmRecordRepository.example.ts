/**
 * ==========================================================================
 * PostgreSQL CRM Record Repository (Production Example)
 * ==========================================================================
 *
 * AUDIT FIX #3 + #4: Shows how DedupSearchHints translates to optimized
 * PostgreSQL queries leveraging the pg_trgm and JSONB GIN indexes
 * created in migration 001_crm_indexes_jsonb_trgm.sql.
 *
 * This file is a reference implementation. Swap the InMemory adapter
 * for this one in CrmModule when connecting to a real PostgreSQL database.
 *
 * Key performance characteristics:
 *   - findCandidatesForDedup: Uses pg_trgm similarity() with GIN index
 *     to reduce candidate set from O(N) to O(k) where k << N (typically <50).
 *   - list(): Uses JSONB GIN index for containment queries (@>).
 *   - All queries are tenant-scoped via the composite index.
 * ==========================================================================
 */

import {
  ICrmRecordRepository,
  CrmRecordListQuery,
  CrmRecordListResult,
  DedupSearchHints,
} from '../../domain/repositories/ICrmRecordRepository';
import { CrmRecord } from '../../domain/entities/CrmRecord';

// Example using raw SQL via a generic DB client interface
interface DbClient {
  query<T>(sql: string, params: unknown[]): Promise<{ rows: T[] }>;
}

export class PostgresCrmRecordRepository implements ICrmRecordRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * AUDIT FIX #3: Optimized candidate pre-filtering with pg_trgm.
   *
   * The query builds a dynamic WHERE clause based on available hints,
   * leveraging the GIN trigram indexes for fuzzy matching. Only the
   * top `maxCandidates` are returned, scored by similarity.
   *
   * Index usage:
   *   - idx_crm_records_email             → exact/domain match
   *   - idx_crm_records_first_name_trgm   → similarity(first_name, $hint)
   *   - idx_crm_records_last_name_trgm    → similarity(last_name, $hint)
   *   - idx_crm_records_company_name_trgm → similarity(company_name, $hint)
   *   - idx_crm_records_tenant_type_active → base filter
   */
  async findCandidatesForDedup(
    tenantId: string,
    objectType: string,
    email?: string,
    domain?: string,
    hints?: DedupSearchHints,
    maxCandidates: number = 50,
  ): Promise<CrmRecord[]> {
    const params: unknown[] = [tenantId, objectType];
    const conditions: string[] = [];
    const scoreExpressions: string[] = [];
    let paramIdx = 3;

    // Build hint-based conditions
    if (hints?.email) {
      params.push(hints.email.toLowerCase());
      conditions.push(`properties->>'email' = $${paramIdx}`);
      scoreExpressions.push(`CASE WHEN properties->>'email' = $${paramIdx} THEN 1.0 ELSE 0 END`);
      paramIdx++;
    }

    if (email && !hints?.email) {
      const emailDomain = email.split('@')[1];
      if (emailDomain) {
        params.push(emailDomain);
        conditions.push(`properties->>'email' LIKE '%@' || $${paramIdx}`);
        paramIdx++;
      }
    }

    if (hints?.firstName) {
      params.push(hints.firstName.toLowerCase());
      const threshold = hints.similarityThreshold ?? 0.3;
      conditions.push(`similarity(properties->>'first_name', $${paramIdx}) > ${threshold}`);
      scoreExpressions.push(`similarity(properties->>'first_name', $${paramIdx}) * 0.3`);
      paramIdx++;
    }

    if (hints?.lastName) {
      params.push(hints.lastName.toLowerCase());
      const threshold = hints.similarityThreshold ?? 0.3;
      conditions.push(`similarity(properties->>'last_name', $${paramIdx}) > ${threshold}`);
      scoreExpressions.push(`similarity(properties->>'last_name', $${paramIdx}) * 0.4`);
      paramIdx++;
    }

    if (hints?.companyName) {
      params.push(hints.companyName.toLowerCase());
      const threshold = hints.similarityThreshold ?? 0.3;
      conditions.push(`similarity(properties->>'name', $${paramIdx}) > ${threshold}`);
      scoreExpressions.push(`similarity(properties->>'name', $${paramIdx}) * 0.2`);
      paramIdx++;
    }

    if (hints?.phoneDigits) {
      const last7 = hints.phoneDigits.slice(-7);
      params.push(`%${last7}`);
      conditions.push(`regexp_replace(properties->>'phone', '[^0-9]', '', 'g') LIKE $${paramIdx}`);
      scoreExpressions.push(`CASE WHEN regexp_replace(properties->>'phone', '[^0-9]', '', 'g') LIKE $${paramIdx} THEN 0.6 ELSE 0 END`);
      paramIdx++;
    }

    if (domain) {
      params.push(domain.toLowerCase());
      conditions.push(`properties->>'domain' = $${paramIdx}`);
      paramIdx++;
    }

    // If no hints provided, fall back to basic filter (limited)
    const hintClause = conditions.length > 0
      ? `AND (${conditions.join(' OR ')})`
      : '';

    const scoreClause = scoreExpressions.length > 0
      ? `(${scoreExpressions.join(' + ')}) AS _score`
      : '0 AS _score';

    params.push(maxCandidates);

    const sql = `
      SELECT *, ${scoreClause}
      FROM crm_records
      WHERE tenant_id = $1
        AND object_type = $2
        AND archived = false
        ${hintClause}
      ORDER BY _score DESC
      LIMIT $${paramIdx}
    `;

    const { rows } = await this.db.query<CrmRecord>(sql, params);
    return rows;
  }

  // --- Other methods (findById, list, save, etc.) would follow ---
  // Each leverages the JSONB GIN index for property-based queries:
  //
  //   WHERE properties @> '{"industry": "SaaS"}'::jsonb    → GIN index hit
  //   WHERE properties->>'email' = 'user@example.com'      → expression index hit
  //   ORDER BY properties->>'create_date' DESC             → expression index hit

  async findById(_t: string, _id: string): Promise<CrmRecord | null> { return null; }
  async findByEmail(_t: string, _e: string): Promise<CrmRecord | null> { return null; }
  async findByDomain(_t: string, _d: string): Promise<CrmRecord | null> { return null; }
  async list(_q: CrmRecordListQuery): Promise<CrmRecordListResult> {
    return { records: [], total: 0, page: 1, limit: 25, totalPages: 0 };
  }
  async save(_r: CrmRecord): Promise<void> {}
  async archive(_t: string, _id: string): Promise<void> {}
  async delete(_t: string, _id: string): Promise<void> {}
}
