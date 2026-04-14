import { Injectable } from '@nestjs/common';
import {
  ICrmRecordRepository,
  CrmRecordListQuery,
  CrmRecordListResult,
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

  async findCandidatesForDedup(
    tenantId: string,
    objectType: string,
    email?: string,
    domain?: string,
  ): Promise<CrmRecord[]> {
    return Array.from(this.records.values()).filter(
      (r) => r.tenantId === tenantId && r.objectType === objectType && !r.archived,
    );
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
