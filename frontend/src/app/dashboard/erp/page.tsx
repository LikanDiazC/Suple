'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../../presentation/components/layout/TopBar';
import { pageTransition, staggerContainer, staggerItem } from '../../../presentation/animations/variants';
import { tokens } from '../../../presentation/theme/tokens';
import { useCurrency } from '../../../application/context/currency/CurrencyContext';

type EntryStatus = 'Posted' | 'Draft' | 'Reversed';

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  source: string;
  debit: number;
  credit: number;
  status: EntryStatus;
}

const STATUS_LABEL: Record<EntryStatus, string> = {
  Posted:   'Contabilizado',
  Draft:    'Borrador',
  Reversed: 'Reversado',
};

export default function ERPPage() {
  const [filter, setFilter] = useState<'all' | 'Posted' | 'Draft' | 'Reversed'>('all');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchEntries() {
      setLoading(true);
      try {
        const res = await fetch('/api/erp/journal?page=1&limit=50', { cache: 'no-store' });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (!cancelled) setEntries(data.items ?? data ?? []);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEntries();
    return () => { cancelled = true; };
  }, []);

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.status === filter);
  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);

  const { fmt, code: currCode } = useCurrency();

  return (
    <>
      <TopBar title="ERP" subtitle="Asientos contables — Fuente única de verdad" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-4 sm:p-6 lg:p-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {[
            { label: 'Total debe',  value: fmt(totalDebit),               color: tokens.colors.info.base },
            { label: 'Total haber', value: fmt(totalCredit),              color: tokens.colors.success.base },
            { label: 'Balance',     value: fmt(totalDebit - totalCredit), color: totalDebit === totalCredit ? tokens.colors.success.base : tokens.colors.danger.base },
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
              {f === 'all' ? 'Todos los asientos' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        {/* Journal Table */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Asiento</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Fecha</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Descripción</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Origen</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Debe</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Haber</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-neutral-400">
                    <svg className="animate-spin inline-block mr-2" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" strokeDasharray="20" strokeDashoffset="10"/></svg>
                    Cargando asientos contables...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-neutral-400">
                    No hay asientos contables en este período.
                  </td>
                </tr>
              ) : filtered.map((entry) => (
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
                      {STATUS_LABEL[entry.status]}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-50 font-semibold">
                <td colSpan={4} className="px-6 py-3 text-sm text-neutral-700">Totales</td>
                <td className="px-6 py-3 text-right text-sm font-mono text-neutral-900">{fmt(totalDebit)} <span className="text-[0.65em] font-normal text-neutral-400">{currCode}</span></td>
                <td className="px-6 py-3 text-right text-sm font-mono text-neutral-900">{fmt(totalCredit)} <span className="text-[0.65em] font-normal text-neutral-400">{currCode}</span></td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-bold ${totalDebit === totalCredit ? 'text-green-600' : 'text-red-600'}`}>
                    {totalDebit === totalCredit ? 'CUADRADO' : 'DESCUADRADO'}
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
