import { AggregateRoot, UniqueId, Result } from '../../../../shared/kernel';
import { Money } from '../value-objects/Money';

/**
 * ==========================================================================
 * Universal Journal Entry (Inspired by SAP ACDOCA)
 * ==========================================================================
 *
 * Single Source of Truth for all financial transactions.
 * Consolidates what traditionally requires multiple sub-ledgers:
 *   - General Ledger (GL)
 *   - Accounts Payable / Receivable (AP/AR)
 *   - Cost Center Accounting
 *   - Asset Accounting
 *   - Profit Center Accounting
 *
 * Each JournalEntry is an immutable aggregate containing one or more
 * line items. The fundamental invariant is:
 *   SUM(debits) === SUM(credits) for every entry (double-entry bookkeeping).
 *
 * This eliminates:
 *   - Batch reconciliation between sub-ledgers.
 *   - Data redundancy across aggregation tables.
 *   - Period-end close delays from reconciliation processes.
 *
 * Queries can be executed directly against transactional data
 * without intermediate aggregation (in-memory capable).
 * ==========================================================================
 */

export interface JournalLineItem {
  lineNumber: number;
  accountCode: string;       // GL account (e.g., "4100-00" Revenue)
  costCenter?: string;       // Cost center for management accounting
  profitCenter?: string;     // Profit center for segment reporting
  businessPartner?: string;  // Customer/Vendor ID (replaces AP/AR sub-ledger)
  assetId?: string;          // Fixed asset ID (replaces asset sub-ledger)
  amount: Money;
  type: LineItemType;
  description: string;
  dimensions: Record<string, string>; // Extensible analytical dimensions
}

export enum LineItemType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

export enum JournalEntrySource {
  MANUAL = 'MANUAL',
  AP_INVOICE = 'AP_INVOICE',
  AR_INVOICE = 'AR_INVOICE',
  PAYROLL = 'PAYROLL',
  ASSET_DEPRECIATION = 'ASSET_DEPRECIATION',
  INVENTORY_VALUATION = 'INVENTORY_VALUATION',
  BANK_RECONCILIATION = 'BANK_RECONCILIATION',
  INTERCOMPANY = 'INTERCOMPANY',
  SYSTEM_ACCRUAL = 'SYSTEM_ACCRUAL',
}

interface JournalEntryProps {
  entryNumber: string;
  fiscalYear: number;
  fiscalPeriod: number;
  postingDate: Date;
  documentDate: Date;
  currency: string;
  source: JournalEntrySource;
  status: JournalEntryStatus;
  lineItems: JournalLineItem[];
  description: string;
  reversalOfEntryId?: string;
  createdBy: string;
  createdAt: Date;
}

export class JournalEntry extends AggregateRoot<JournalEntryProps> {
  private constructor(id: UniqueId, tenantId: string, props: JournalEntryProps) {
    super(id, tenantId, props);
  }

  /**
   * Factory method with built-in double-entry validation.
   * Rejects any entry where debits and credits are not balanced.
   */
  static create(
    tenantId: string,
    params: {
      entryNumber: string;
      fiscalYear: number;
      fiscalPeriod: number;
      postingDate: Date;
      documentDate: Date;
      currency: string;
      source: JournalEntrySource;
      lineItems: JournalLineItem[];
      description: string;
      createdBy: string;
    },
  ): Result<JournalEntry> {
    // --- Invariant: At least 2 line items (debit + credit) ---
    if (params.lineItems.length < 2) {
      return Result.fail(
        'Journal entry must have at least 2 line items (debit and credit)',
      );
    }

    // --- Invariant: Debits must equal credits ---
    const balanceValidation = this.validateBalance(params.lineItems);
    if (balanceValidation.isFail()) {
      return Result.fail(balanceValidation.error);
    }

    // --- Invariant: All line items must use the same currency ---
    const currencies = new Set(params.lineItems.map((li) => li.amount.currency));
    if (currencies.size > 1) {
      return Result.fail(
        `All line items must use the same currency. Found: [${[...currencies].join(', ')}]`,
      );
    }

    const entry = new JournalEntry(UniqueId.create(), tenantId, {
      ...params,
      status: JournalEntryStatus.DRAFT,
      createdAt: new Date(),
    });

    return Result.ok(entry);
  }

  /**
   * Validates the fundamental accounting equation:
   *   Total Debits === Total Credits
   *
   * Uses integer arithmetic (cents) to avoid floating-point drift.
   */
  private static validateBalance(lineItems: JournalLineItem[]): Result<void> {
    let totalDebits = 0;
    let totalCredits = 0;

    for (const item of lineItems) {
      if (item.type === LineItemType.DEBIT) {
        totalDebits += item.amount.cents;
      } else {
        totalCredits += item.amount.cents;
      }
    }

    if (totalDebits !== totalCredits) {
      const debitAmount = totalDebits / 100;
      const creditAmount = totalCredits / 100;
      return Result.fail(
        `Unbalanced entry: Debits (${debitAmount}) !== Credits (${creditAmount}). ` +
        `Difference: ${Math.abs(debitAmount - creditAmount)}`,
      );
    }

    return Result.ok(undefined);
  }

  post(): Result<void> {
    if (this.props.status !== JournalEntryStatus.DRAFT) {
      return Result.fail(`Cannot post entry in status: ${this.props.status}`);
    }
    this.props.status = JournalEntryStatus.POSTED;
    return Result.ok(undefined);
  }

  /**
   * Creates a reversal entry (storno) rather than deleting.
   * Financial records are never deleted -- only reversed with
   * an offsetting entry, maintaining a complete audit trail.
   */
  createReversalLineItems(): JournalLineItem[] {
    return this.props.lineItems.map((item) => ({
      ...item,
      type: item.type === LineItemType.DEBIT ? LineItemType.CREDIT : LineItemType.DEBIT,
      description: `Reversal: ${item.description}`,
    }));
  }

  get entryNumber(): string { return this.props.entryNumber; }
  get status(): JournalEntryStatus { return this.props.status; }
  get lineItems(): ReadonlyArray<JournalLineItem> { return this.props.lineItems; }
  get postingDate(): Date { return this.props.postingDate; }
  get source(): JournalEntrySource { return this.props.source; }

  get totalDebits(): number {
    return this.props.lineItems
      .filter((li) => li.type === LineItemType.DEBIT)
      .reduce((sum, li) => sum + li.amount.cents, 0) / 100;
  }

  get totalCredits(): number {
    return this.props.lineItems
      .filter((li) => li.type === LineItemType.CREDIT)
      .reduce((sum, li) => sum + li.amount.cents, 0) / 100;
  }
}
