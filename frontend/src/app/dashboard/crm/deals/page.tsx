'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '../../../../presentation/animations/variants';
import { useCurrency, M } from '../../../../application/context/currency/CurrencyContext';

// ---------------------------------------------------------------------------
// Types & Data
// ---------------------------------------------------------------------------

type Stage = 'prospecto' | 'calificado' | 'propuesta' | 'negociacion' | 'cerrado_ganado' | 'cerrado_perdido';

interface Deal {
  id: string;
  name: string;
  company: string;
  companyColor: string;
  value: number;
  probability: number;
  stage: Stage;
  owner: string;
  ownerColor: string;
  closeDate: string;
  source: string;
  notes?: string;
}

const STAGES: { key: Stage; label: string; accent: string; headerBg: string; dot: string }[] = [
  { key: 'prospecto',      label: 'Prospecto',       accent: 'border-t-neutral-400',  headerBg: 'bg-neutral-50',  dot: 'bg-neutral-400' },
  { key: 'calificado',     label: 'Calificado',      accent: 'border-t-blue-400',     headerBg: 'bg-blue-50',     dot: 'bg-blue-400' },
  { key: 'propuesta',      label: 'Propuesta',       accent: 'border-t-amber-400',    headerBg: 'bg-amber-50',    dot: 'bg-amber-400' },
  { key: 'negociacion',    label: 'Negociación',     accent: 'border-t-orange-400',   headerBg: 'bg-orange-50',   dot: 'bg-orange-400' },
  { key: 'cerrado_ganado', label: 'Cerrado ✓',       accent: 'border-t-green-500',    headerBg: 'bg-green-50',    dot: 'bg-green-500' },
  { key: 'cerrado_perdido',label: 'Perdido ✕',       accent: 'border-t-red-400',      headerBg: 'bg-red-50',      dot: 'bg-red-400' },
];

const INITIAL_DEALS: Deal[] = [
  {
    id: 'd1', name: 'Implementación ERP — UDLA',
    company: 'UDLA', companyColor: 'bg-violet-500',
    value: 12500000, probability: 80, stage: 'negociacion',
    owner: 'MR', ownerColor: 'from-primary-400 to-primary-600',
    closeDate: '2026-05-15', source: 'Inbound',
    notes: 'Cliente interesado en módulo de RRHH y Finanzas. Reunión agendada para el 20 de mayo.',
  },
  {
    id: 'd2', name: 'Licencia Suple — Fracttal',
    company: 'Fracttal', companyColor: 'bg-emerald-500',
    value: 8400000, probability: 60, stage: 'propuesta',
    owner: 'SG', ownerColor: 'from-emerald-400 to-teal-600',
    closeDate: '2026-05-30', source: 'Outbound',
  },
  {
    id: 'd3', name: 'Consultoría BPMS — Sodimac',
    company: 'Sodimac', companyColor: 'bg-orange-500',
    value: 4200000, probability: 40, stage: 'calificado',
    owner: 'MR', ownerColor: 'from-primary-400 to-primary-600',
    closeDate: '2026-06-15', source: 'Referral',
  },
  {
    id: 'd4', name: 'Suscripción Anual — ICI Ingeniería',
    company: 'ICI', companyColor: 'bg-blue-600',
    value: 3600000, probability: 100, stage: 'cerrado_ganado',
    owner: 'SG', ownerColor: 'from-emerald-400 to-teal-600',
    closeDate: '2026-04-10', source: 'Inbound',
  },
  {
    id: 'd5', name: 'Módulo SCM — Cencosud',
    company: 'Cencosud', companyColor: 'bg-red-600',
    value: 18000000, probability: 20, stage: 'prospecto',
    owner: 'LT', ownerColor: 'from-amber-400 to-orange-600',
    closeDate: '2026-07-01', source: 'Cold Outreach',
  },
  {
    id: 'd6', name: 'Renovación Contrato — AVEVA',
    company: 'AVEVA', companyColor: 'bg-cyan-600',
    value: 6200000, probability: 75, stage: 'negociacion',
    owner: 'LT', ownerColor: 'from-amber-400 to-orange-600',
    closeDate: '2026-05-01', source: 'Renewal',
  },
  {
    id: 'd7', name: 'Piloto CRM — StartupX',
    company: 'StartupX', companyColor: 'bg-pink-500',
    value: 890000, probability: 50, stage: 'propuesta',
    owner: 'SG', ownerColor: 'from-emerald-400 to-teal-600',
    closeDate: '2026-06-01', source: 'Inbound',
  },
  {
    id: 'd8', name: 'Integración API — Banco Estado',
    company: 'Banco Estado', companyColor: 'bg-blue-800',
    value: 22000000, probability: 30, stage: 'calificado',
    owner: 'MR', ownerColor: 'from-primary-400 to-primary-600',
    closeDate: '2026-08-01', source: 'Outbound',
  },
  {
    id: 'd9', name: 'Expansión Módulos — UDLA',
    company: 'UDLA', companyColor: 'bg-violet-500',
    value: 5500000, probability: 85, stage: 'cerrado_ganado',
    owner: 'MR', ownerColor: 'from-primary-400 to-primary-600',
    closeDate: '2026-04-05', source: 'Upsell',
  },
  {
    id: 'd10', name: 'Demo Suple — Falabella',
    company: 'Falabella', companyColor: 'bg-green-700',
    value: 35000000, probability: 15, stage: 'prospecto',
    owner: 'LT', ownerColor: 'from-amber-400 to-orange-600',
    closeDate: '2026-09-01', source: 'Cold Outreach',
  },
  {
    id: 'd11', name: 'Consultoría BI — Codelco',
    company: 'Codelco', companyColor: 'bg-yellow-600',
    value: 9800000, probability: 0, stage: 'cerrado_perdido',
    owner: 'SG', ownerColor: 'from-emerald-400 to-teal-600',
    closeDate: '2026-03-31', source: 'Outbound',
  },
];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });

const OWNERS = ['Todos', 'MR', 'SG', 'LT'];

// ---------------------------------------------------------------------------
// Deal Card
// ---------------------------------------------------------------------------

interface DealCardProps {
  deal: Deal;
  onMoveStage: (id: string, stage: Stage) => void;
  onSelect: (deal: Deal) => void;
}

function DealCard({ deal, onMoveStage, onSelect }: DealCardProps) {
  const [showMove, setShowMove] = useState(false);
  const daysLeft = Math.ceil(
    (new Date(deal.closeDate).getTime() - Date.now()) / 86_400_000
  );
  const isOverdue = daysLeft < 0 && deal.stage !== 'cerrado_ganado' && deal.stage !== 'cerrado_perdido';
  const isSoon = daysLeft >= 0 && daysLeft <= 7 && deal.stage !== 'cerrado_ganado' && deal.stage !== 'cerrado_perdido';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(deal)}
    >
      {/* Company badge + value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full ${deal.companyColor} px-2 py-0.5 text-[10px] font-bold text-white`}>
          {deal.company}
        </span>
        <span className="text-sm font-bold text-neutral-900"><M v={deal.value} short /></span>
      </div>

      {/* Deal name */}
      <p className="text-[13px] font-semibold text-neutral-800 leading-snug mb-3 line-clamp-2">{deal.name}</p>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-neutral-400">Probabilidad</span>
          <span className={`font-semibold ${deal.probability >= 70 ? 'text-green-600' : deal.probability >= 40 ? 'text-amber-600' : 'text-neutral-500'}`}>
            {deal.probability}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${deal.probability >= 70 ? 'bg-green-500' : deal.probability >= 40 ? 'bg-amber-400' : 'bg-neutral-300'}`}
            style={{ width: `${deal.probability}%` }}
          />
        </div>
      </div>

      {/* Footer: close date + owner + move */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Owner */}
          <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${deal.ownerColor} flex items-center justify-center`}>
            <span className="text-[9px] font-bold text-white">{deal.owner}</span>
          </div>
          {/* Close date */}
          <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-neutral-400'}`}>
            {isOverdue ? '⚠ ' : isSoon ? '⏰ ' : ''}{fmtDate(deal.closeDate)}
          </span>
        </div>

        {/* Move stage */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowMove(!showMove)}
            className="rounded-md border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 hover:bg-neutral-50 transition-colors"
          >
            Mover ↓
          </button>
          <AnimatePresence>
            {showMove && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-neutral-200 bg-white shadow-xl z-20 py-1"
              >
                {STAGES.filter(s => s.key !== deal.stage).map(s => (
                  <button
                    key={s.key}
                    onClick={() => { onMoveStage(deal.id, s.key); setShowMove(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-neutral-700 hover:bg-neutral-50 transition-colors"
                  >
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

function DealDetailPanel({ deal, onClose, onMoveStage }: { deal: Deal; onClose: () => void; onMoveStage: (id: string, stage: Stage) => void }) {
  const stage = STAGES.find(s => s.key === deal.stage)!;
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 z-50 h-screen w-96 border-l border-neutral-200 bg-white shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-5">
        <span className={`inline-flex items-center gap-1.5 rounded-full ${deal.companyColor} px-2.5 py-1 text-xs font-bold text-white`}>
          {deal.company}
        </span>
        <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l10 10M13 3L3 13"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Deal name + value */}
        <div>
          <p className="text-lg font-bold text-neutral-900 leading-snug mb-1">{deal.name}</p>
          <p className="text-2xl font-bold text-primary-600"><M v={deal.value} /></p>
        </div>

        {/* Stage badge */}
        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${stage.headerBg}`}>
          <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
          {stage.label}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Probabilidad', value: `${deal.probability}%` },
            { label: 'Cierre estimado', value: new Date(deal.closeDate).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: 'Fuente', value: deal.source },
            { label: 'Responsable', value: deal.owner },
          ].map(row => (
            <div key={row.label} className="rounded-lg bg-neutral-50 p-3">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">{row.label}</p>
              <p className="text-sm font-semibold text-neutral-800">{row.value}</p>
            </div>
          ))}
        </div>

        {/* Probability bar */}
        <div className="rounded-xl bg-neutral-50 p-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-neutral-500 font-medium">Probabilidad de cierre</span>
            <span className="font-bold text-neutral-800">{deal.probability}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${deal.probability}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${deal.probability >= 70 ? 'bg-green-500' : deal.probability >= 40 ? 'bg-amber-400' : 'bg-neutral-400'}`}
            />
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            Valor ponderado: <M v={Math.round(deal.value * deal.probability / 100)} short />
          </p>
        </div>

        {/* Notes */}
        {deal.notes && (
          <div className="rounded-xl border border-neutral-100 p-4">
            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Notas</p>
            <p className="text-sm text-neutral-700 leading-relaxed">{deal.notes}</p>
          </div>
        )}

        {/* Move stage */}
        <div>
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Cambiar etapa</p>
          <div className="space-y-1.5">
            {STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => { onMoveStage(deal.id, s.key); onClose(); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  s.key === deal.stage
                    ? `${s.headerBg} text-neutral-800 cursor-default`
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                {s.label}
                {s.key === deal.stage && <span className="ml-auto text-[10px] text-neutral-400">← actual</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-neutral-200 p-4 flex gap-2">
        <button className="flex-1 rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
          Editar deal
        </button>
        <button className="rounded-lg border border-neutral-200 px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8 2v12M2 8h12"/></svg>
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [ownerFilter, setOwnerFilter] = useState('Todos');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const filtered = useMemo(() =>
    ownerFilter === 'Todos' ? deals : deals.filter(d => d.owner === ownerFilter),
    [deals, ownerFilter]
  );

  const moveStage = (id: string, newStage: Stage) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: newStage } : d));
    if (selectedDeal?.id === id) setSelectedDeal(prev => prev ? { ...prev, stage: newStage } : null);
  };

  // Summary KPIs
  const activeDealsList = deals.filter(d => d.stage !== 'cerrado_ganado' && d.stage !== 'cerrado_perdido');
  const totalPipeline   = activeDealsList.reduce((s, d) => s + d.value, 0);
  const weightedPipeline= activeDealsList.reduce((s, d) => s + d.value * d.probability / 100, 0);
  const wonDeals        = deals.filter(d => d.stage === 'cerrado_ganado');
  const wonValue        = wonDeals.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <motion.div variants={pageTransition} initial="initial" animate="animate" className="flex flex-col h-full">
        {/* Summary KPIs */}
        <div className="shrink-0 px-6 pt-5 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-5">
            {[
              { label: 'Pipeline total',    amount: totalPipeline,    sub: `${activeDealsList.length} deals activos` },
              { label: 'Pipeline ponderado',amount: weightedPipeline, sub: 'por probabilidad' },
              { label: 'Cerrado ganado',    amount: wonValue,         sub: `${wonDeals.length} deals` },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-xl border border-neutral-100 shadow-sm px-5 py-4">
                <p className="text-xs text-neutral-400 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-neutral-900"><M v={kpi.amount} short /></p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{kpi.sub}</p>
              </div>
            ))}
            <div className="bg-white rounded-xl border border-neutral-100 shadow-sm px-5 py-4">
              <p className="text-xs text-neutral-400 mb-1">Tasa de cierre</p>
              <p className="text-2xl font-bold text-neutral-900">{wonDeals.length + deals.filter(d=>d.stage==='cerrado_perdido').length > 0 ? Math.round(wonDeals.length / (wonDeals.length + deals.filter(d=>d.stage==='cerrado_perdido').length) * 100) : 0}%</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">ganados vs perdidos</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-medium">Responsable:</span>
              {OWNERS.map(o => (
                <button
                  key={o}
                  onClick={() => setOwnerFilter(o)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    ownerFilter === o ? 'bg-primary-50 text-primary-700' : 'bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v10M1 6h10"/></svg>
              Nuevo deal
            </button>
          </div>
        </div>

        {/* Kanban Board (horizontal scroll) */}
        <div className="flex-1 overflow-x-auto min-h-0 px-6 pb-6">
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map(stage => {
              const stageDeals = filtered.filter(d => d.stage === stage.key);
              const stageTotalValue = stageDeals.reduce((s, d) => s + d.value, 0);
              return (
                <div key={stage.key} className="flex flex-col w-72 shrink-0">
                  {/* Column header */}
                  <div className={`rounded-xl border-t-4 ${stage.accent} ${stage.headerBg} border border-neutral-100 px-3 py-3 mb-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                        <span className="text-xs font-bold text-neutral-700">{stage.label}</span>
                      </div>
                      <span className="rounded-full bg-white border border-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-neutral-800 mt-1"><M v={stageTotalValue} short /></p>
                  </div>

                  {/* Deal cards */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
                    <AnimatePresence>
                      {stageDeals.map(deal => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          onMoveStage={moveStage}
                          onSelect={setSelectedDeal}
                        />
                      ))}
                    </AnimatePresence>
                    {stageDeals.length === 0 && (
                      <div className="rounded-xl border-2 border-dashed border-neutral-200 py-8 text-center">
                        <p className="text-[11px] text-neutral-300 font-medium">Sin deals</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Detail panel overlay */}
      <AnimatePresence>
        {selectedDeal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/10"
              onClick={() => setSelectedDeal(null)}
            />
            <DealDetailPanel
              deal={selectedDeal}
              onClose={() => setSelectedDeal(null)}
              onMoveStage={moveStage}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
