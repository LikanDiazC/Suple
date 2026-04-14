'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../../presentation/components/layout/TopBar';
import { pageTransition, staggerContainer, staggerItem } from '../../../presentation/animations/variants';
import { tokens } from '../../../presentation/theme/tokens';
import { useCurrency } from '../../../application/context/currency/CurrencyContext';

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  source: string;
  debit: number;
  credit: number;
  status: 'Posted' | 'Draft' | 'Reversed';
}

const MOCK_ENTRIES: JournalEntry[] = [
  { id: '1', entryNumber: 'JE-2026-001', date: '2026-04-12', description: 'Revenue Recognition - Q1 Services',      source: 'AR_INVOICE',       debit: 284750, credit: 284750, status: 'Posted' },
  { id: '2', entryNumber: 'JE-2026-002', date: '2026-04-11', description: 'Vendor Payment - Globex Supply Co.',     source: 'AP_INVOICE',       debit: 47200,  credit: 47200,  status: 'Posted' },
  { id: '3', entryNumber: 'JE-2026-003', date: '2026-04-11', description: 'Monthly Payroll - April 2026',           source: 'PAYROLL',          debit: 156800, credit: 156800, status: 'Posted' },
  { id: '4', entryNumber: 'JE-2026-004', date: '2026-04-10', description: 'Equipment Depreciation - Data Center',   source: 'ASSET_DEPRECIATION',debit: 12400, credit: 12400,  status: 'Posted' },
  { id: '5', entryNumber: 'JE-2026-005', date: '2026-04-10', description: 'Inventory Valuation Adjustment',         source: 'INVENTORY',        debit: 8300,   credit: 8300,   status: 'Draft' },
  { id: '6', entryNumber: 'JE-2026-006', date: '2026-04-09', description: 'Bank Reconciliation - Main Operating',   source: 'BANK_RECON',       debit: 523000, credit: 523000, status: 'Posted' },
  { id: '7', entryNumber: 'JE-2026-007', date: '2026-04-08', description: 'Intercompany Transfer - EU Division',    source: 'INTERCOMPANY',     debit: 91500,  credit: 91500,  status: 'Reversed' },
];

export default function ERPPage() {
  const [filter, setFilter] = useState<'all' | 'Posted' | 'Draft' | 'Reversed'>('all');

  const filtered = filter === 'all' ? MOCK_ENTRIES : MOCK_ENTRIES.filter((e) => e.status === filter);
  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);

  const { fmt, code: currCode } = useCurrency();

  return (
    <>
      <TopBar title="ERP" subtitle="Universal Journal - Single Source of Truth" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {[
            { label: 'Total Debits', value: fmt(totalDebit), color: tokens.colors.info.base },
            { label: 'Total Credits', value: fmt(totalCredit), color: tokens.colors.success.base },
            { label: 'Balance', value: fmt(totalDebit - totalCredit), color: totalDebit === totalCredit ? tokens.colors.success.base : tokens.colors.danger.base },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{card.value} <span className="text-[10px] font-normal text-neutral-400">{currCode}</span></p>
              <div className="mt-2 h-1 w-12 rounded-full" style={{ backgroundColor: card.color }} />
            </motion.div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-4">
          {(['all', 'Posted', 'Draft', 'Reversed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {f === 'all' ? 'All Entries' : f}
            </button>
          ))}
        </div>

        {/* Journal Table */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Entry</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Date</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Description</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Source</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Debit</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Credit</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <motion.tr key={entry.id} variants={staggerItem} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-primary-600">{entry.entryNumber}</td>
                  <td className="px-6 py-4 text-sm text-neutral-500">{entry.date}</td>
                  <td className="px-6 py-4 text-sm text-neutral-800">{entry.description}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-mono text-neutral-600">{entry.source}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-mono text-neutral-800">{fmt(entry.debit)} <span className="text-[0.65em] font-normal text-neutral-400">{currCode}</span></td>
                  <td className="px-6 py-4 text-right text-sm font-mono text-neutral-800">{fmt(entry.credit)} <span className="text-[0.65em] font-normal text-neutral-400">{currCode}</span></td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      entry.status === 'Posted' ? 'bg-green-50 text-green-700' :
                      entry.status === 'Draft' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-50 font-semibold">
                <td colSpan={4} className="px-6 py-3 text-sm text-neutral-700">Totals</td>
                <td className="px-6 py-3 text-right text-sm font-mono text-neutral-900">{fmt(totalDebit)} <span className="text-[0.65em] font-normal text-neutral-400">{currCode}</span></td>
                <td className="px-6 py-3 text-right text-sm font-mono text-neutral-900">{fmt(totalCredit)} <span className="text-[0.65em] font-normal text-neutral-400">{currCode}</span></td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-bold ${totalDebit === totalCredit ? 'text-green-600' : 'text-red-600'}`}>
                    {totalDebit === totalCredit ? 'BALANCED' : 'UNBALANCED'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </motion.div>
      </motion.div>
    </>
  );
}
