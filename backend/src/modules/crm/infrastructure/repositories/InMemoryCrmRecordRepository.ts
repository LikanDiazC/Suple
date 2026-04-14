import { Injectable } from '@nestjs/common';
import {
  ICrmRecordRepository,
  CrmRecordListQuery,
  CrmRecordListResult,
  DedupSearchHints,
} from '../../domain/repositories/ICrmRecordRepository';
import { CrmRecord, PropertySource } from '../../domain/entities/CrmRecord';

/**
 * ==========================================================================
 * In-Memory CRM Record Repository
 * ==========================================================================
 *
 * Development/testing implementation seeded with real user data.
 * Production will swap this for PostgreSQL via NestJS DI.
 * ==========================================================================
 */
@Injectable()
export class InMemoryCrmRecordRepository implements ICrmRecordRepository {
  private records: Map<string, CrmRecord> = new Map();

  constructor() {
    this.seed();
  }

  async findById(tenantId: string, recordId: string): Promise<CrmRecord | null> {
    const record = this.records.get(recordId);
    if (record && record.tenantId === tenantId && !record.archived) return record;
    return null;
  }

  async findByEmail(tenantId: string, email: string): Promise<CrmRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const record of this.records.values()) {
      if (
        record.tenantId === tenantId &&
        record.objectType === 'contacts' &&
        record.email === normalized &&
        !record.archived
      ) {
        return record;
      }
    }
    return null;
  }

  async findByDomain(tenantId: string, domain: string): Promise<CrmRecord | null> {
    const normalized = domain.toLowerCase().trim().replace(/^www\./, '');
    for (const record of this.records.values()) {
      if (
        record.tenantId === tenantId &&
        record.objectType === 'companies' &&
        record.domain === normalized &&
        !record.archived
      ) {
        return record;
      }
    }
    return null;
  }

  async list(query: CrmRecordListQuery): Promise<CrmRecordListResult> {
    let records = Array.from(this.records.values()).filter(
      (r) => r.tenantId === query.tenantId && r.objectType === query.objectType && !r.archived,
    );

    // Search filter
    if (query.search) {
      const search = query.search.toLowerCase();
      records = records.filter((r) => {
        const props = r.toPropertiesRecord();
        return Object.values(props).some(
          (v) => typeof v === 'string' && v.toLowerCase().includes(search),
        );
      });
    }

    // Property filters
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        records = records.filter((r) => {
          const propValue = r.getPropertyValue(key);
          return propValue !== undefined && String(propValue).toLowerCase() === value.toLowerCase();
        });
      }
    }

    // Sort
    records.sort((a, b) => {
      const aProps = a.toPropertiesRecord();
      const bProps = b.toPropertiesRecord();
      const aVal = String(aProps[query.sortBy] ?? '');
      const bVal = String(bProps[query.sortBy] ?? '');
      return query.sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    const total = records.length;
    const start = (query.page - 1) * query.limit;
    const paged = records.slice(start, start + query.limit);

    return {
      records: paged,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async save(record: CrmRecord): Promise<void> {
    this.records.set(record.id.toString(), record);
  }

  async archive(tenantId: string, recordId: string): Promise<void> {
    const record = this.records.get(recordId);
    if (record && record.tenantId === tenantId) {
      record.archive();
    }
  }

  async delete(tenantId: string, recordId: string): Promise<void> {
    const record = this.records.get(recordId);
    if (record && record.tenantId === tenantId) {
      this.records.delete(recordId);
    }
  }

  /**
   * AUDIT FIX #3: Optimized candidate pre-filtering.
   *
   * In-memory implementation simulates what PostgreSQL pg_trgm would do:
   * 1. First narrows by tenant + objectType + not archived (base filter).
   * 2. Then applies hint-based scoring to rank candidates.
   * 3. Returns only the top `maxCandidates` (default 50).
   *
   * In production (PostgreSQL), this becomes a single SQL query:
   *   WHERE tenant_id = $1 AND object_type = $2
   *     AND (email = $3 OR similarity(first_name, $4) > 0.3 OR ...)
   *   ORDER BY similarity DESC LIMIT 50;
   */
  async findCandidatesForDedup(
    tenantId: string,
    objectType: string,
    email?: string,
    domain?: string,
    hints?: DedupSearchHints,
    maxCandidates: number = 50,
  ): Promise<CrmRecord[]> {
    // Base filter (cheap — tenant + type + not archived)
    const base = Array.from(this.records.values()).filter(
      (r) => r.tenantId === tenantId && r.objectType === objectType && !r.archived,
    );

    // If no hints provided, fall back to old behavior (backwards-compatible)
    if (!hints) return base.slice(0, maxCandidates);

    const threshold = hints.similarityThreshold ?? 0.3;

    // Score each record by how likely it is to be a candidate
    const scored = base.map((record) => {
      let score = 0;

      // Exact email match — highest signal
      if (hints.email && record.email) {
        if (record.email.toLowerCase() === hints.email.toLowerCase()) {
          score += 1.0;
        } else {
          // Same domain
          const hintDomain = hints.email.split('@')[1];
          const recDomain = record.email.split('@')[1];
          if (hintDomain && recDomain && hintDomain === recDomain) {
            score += 0.5;
          }
        }
      }

      // Name trigram simulation (in PG this would be similarity())
      const recFirstName = (record.getPropertyValue('first_name') as string ?? '').toLowerCase();
      const recLastName = (record.getPropertyValue('last_name') as string ?? '').toLowerCase();

      if (hints.firstName) {
        const sim = this.trigramSimilarity(hints.firstName.toLowerCase(), recFirstName);
        if (sim >= threshold) score += sim * 0.3;
      }
      if (hints.lastName) {
        const sim = this.trigramSimilarity(hints.lastName.toLowerCase(), recLastName);
        if (sim >= threshold) score += sim * 0.4;
      }

      // Company name similarity
      if (hints.companyName) {
        const recCompany = (record.getPropertyValue('company') as string ?? '').toLowerCase();
        if (recCompany) {
          const sim = this.trigramSimilarity(hints.companyName.toLowerCase(), recCompany);
          if (sim >= threshold) score += sim * 0.2;
        }
      }

      // Phone suffix match
      if (hints.phoneDigits) {
        const recPhone = (record.getPropertyValue('phone') as string ?? '').replace(/\D/g, '');
        if (recPhone && recPhone.endsWith(hints.phoneDigits.slice(-7))) {
          score += 0.6;
        }
      }

      return { record, score };
    });

    // Return only candidates with score > 0, sorted by score, limited
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidates)
      .map((s) => s.record);
  }

  /**
   * Simulates PostgreSQL pg_trgm similarity() function.
   * Splits strings into character trigrams and computes Jaccard similarity.
   * In production, this runs as a GIN-indexed SQL operator.
   */
  private trigramSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1.0;

    const trigramsA = this.extractTrigrams(a);
    const trigramsB = this.extractTrigrams(b);

    if (trigramsA.size === 0 && trigramsB.size === 0) return 1.0;
    if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

    let intersection = 0;
    for (const t of trigramsA) {
      if (trigramsB.has(t)) intersection++;
    }

    // Jaccard coefficient
    const union = trigramsA.size + trigramsB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private extractTrigrams(s: string): Set<string> {
    const padded = `  ${s} `;
    const trigrams = new Set<string>();
    for (let i = 0; i <= padded.length - 3; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  }

  // ---------------------------------------------------------------------------
  // Seed Data (matches user's actual HubSpot data)
  // ---------------------------------------------------------------------------
  private seed(): void {
    const TENANT = 'tnt_demo01';
    const CONTACT_DEF_ID = 'def_contacts_std';
    const COMPANY_DEF_ID = 'def_companies_std';

    const contacts: Record<string, unknown>[] = [
      { first_name: 'UDLA | Universidad de Las Americas', last_name: '', email: 'admision@udla.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-14T11:04:00Z' },
      { first_name: 'App Copec', last_name: '', email: 'contacto@appcopec.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-03-28T16:18:00Z' },
      { first_name: 'Tom Turpel', last_name: 'from AVEVA', email: 'webseminars@aveva.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-16T13:03:00Z' },
      { first_name: 'Pases', last_name: 'Parques', email: 'no-responder@pasesparques.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-16T23:52:00Z' },
      { first_name: 'Admision', last_name: 'Duoc UC', email: 'admisionduocuc@duoc.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-19T19:08:00Z' },
      { first_name: 'Clave Tributaria', last_name: 'SII', email: 'webadm@sii.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-20T22:19:00Z' },
      { first_name: 'Christian Struve', last_name: '- Fracttal', email: 'communication@fracttal.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-21T11:48:00Z' },
      { first_name: 'likanaquilesdiazcalbuqueo', last_name: '', email: 'likanaquilesdiazcalbuqueo@gmail.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-04-04T17:39:00Z' },
      { first_name: 'Cuarta Notaria', last_name: 'La Cisterna', email: 'contacto@cuartanotariala.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-28T14:33:00Z' },
      { first_name: 'Felipe', last_name: 'Carrasco', email: 'fcarrasco@ici-ingenieria.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-29T08:21:00Z' },
      { first_name: 'Ripley', last_name: '.com', email: 'mensajeriaripley@ripley.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-02-03T16:21:00Z' },
      { first_name: 'The Google', last_name: 'Workspace', email: 'workspace@google.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-02-07T18:13:00Z' },
      { first_name: 'Orrego Torres', last_name: 'Maria', email: 'maria.orrego@scotiabank.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-02-18T16:21:00Z' },
      { first_name: 'Napkin', last_name: 'AI', email: 'contact@napkin.ai', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:31:00Z', last_activity: '2026-04-09T09:39:00Z' },
    ];

    const companies: Record<string, unknown>[] = [
      { name: 'University of Las Americas', domain: 'udla.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-14T11:04:00Z' },
      { name: '--', domain: '', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-03-28T16:18:00Z' },
      { name: 'AVEVA Group plc', domain: 'aveva.com', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-16T13:03:00Z' },
      { name: 'Pases Digitales Parques', domain: 'pasesparques.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-16T23:52:00Z' },
      { name: 'Duoc UC', domain: 'duoc.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-19T19:08:00Z' },
      { name: 'Servicio de Impuestos Internos', domain: 'sii.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-20T22:19:00Z' },
      { name: 'Fracttal', domain: 'fracttal.com', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-21T11:48:00Z' },
      { name: 'ICI Ingenieria', domain: 'ici-ingenieria.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-29T08:21:00Z' },
      { name: 'Google', domain: 'google.com', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:31:00Z', last_activity: '2026-02-07T18:13:00Z' },
      { name: 'Napkin AI', domain: 'napkin.ai', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:31:00Z', last_activity: '2026-04-09T09:39:00Z' },
      { name: 'BancoEstado', domain: 'bancoestado.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:31:00Z', last_activity: '2026-02-18T09:22:00Z' },
    ];

    for (const props of contacts) {
      const result = CrmRecord.create(TENANT, CONTACT_DEF_ID, 'contacts', props, 'system', PropertySource.IMPORT);
      if (result.isOk()) this.records.set(result.value.id.toString(), result.value);
    }

    for (const props of companies) {
      const result = CrmRecord.create(TENANT, COMPANY_DEF_ID, 'companies', props, 'system', PropertySource.IMPORT);
      if (result.isOk()) this.records.set(result.value.id.toString(), result.value);
    }
  }
}
