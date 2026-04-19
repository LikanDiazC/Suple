import { JournalEntry } from '../entities/JournalEntry';

export interface JournalListQuery {
  tenantId: string;
  fiscalYear?: number;
  fiscalPeriod?: number;
  status?: string;
  page: number;
  limit: number;
}

export interface IJournalEntryRepository {
  findById(tenantId: string, id: string): Promise<JournalEntry | null>;
  findByReference(tenantId: string, reference: string): Promise<JournalEntry | null>;
  list(query: JournalListQuery): Promise<{ items: JournalEntry[]; total: number }>;
  save(entry: JournalEntry): Promise<void>;
  /** Posts an existing DRAFT entry: relies on DB trigger for balance check (Directive 5). */
  post(tenantId: string, id: string): Promise<void>;
}

export const JOURNAL_ENTRY_REPOSITORY = Symbol('IJournalEntryRepository');
