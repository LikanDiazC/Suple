'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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

const INITIAL_DEALS: Deal[] = [];

// Map backend stage/lifecycle values → Kanban column keys
const STAGE_MAP: Record<string, Stage> = {
  prospecto:        'prospecto',
  lead:             'prospecto',
  new:              'prospecto',
  calificado:       'calificado',
  qualified:        'calificado',
  salesqualified:   'calificado',
  marketingqualified: 'calificado',
  propuesta:        'propuesta',
  proposal:         'propuesta',
  presentationscheduled: 'propuesta',
  negociacion:      'negociacion',
  negociación:      'negociacion',
  negotiation:      'negociacion',
  decisionmakerboughtin: 'negociacion',
  contractsent:     'negociacion',
  cerrado:          'cerrado_ganado',
  cerrado_ganado:   'cerrado_ganado',
  closedwon:        'cerrado_ganado',
  won:              'cerrado_ganado',
  perdido:          'cerrado_perdido',
  cerrado_perdido:  'cerrado_perdido',
  closedlost:       'cerrado_perdido',
  lost:             'cerrado_perdido',
};

const COMPANY_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-rose-500',   'bg-indigo-500', 'bg-teal-500',  'bg-amber-500',
];

const OWNER_COLORS = [
  'from-violet-400 to-purple-600', 'from-blue-400 to-indigo-600',
  'from-emerald-400 to-teal-600',  'from-orange-400 to-red-600',
];

function pickColor(seed: string, palette: string[]): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

interface BackendDeal {
  id: string;
  displayName: string;
  properties: Record<string, unknown>;
}

function mapBackendDeal(r: BackendDeal): Deal {
  const p = r.properties;
  const rawStage = (
    (p['stage'] as string) ||
    (p['deal_stage'] as string) ||
    (p['lifecycle_stage'] as string) ||
    ''
  ).toLowerCase().replace(/[\s_-]/g, '');
  const stage: Stage = STAGE_MAP[rawStage] ?? 'prospecto';

  const company = (p['company'] as string) || (p['domain'] as string) || '—';
  const owner   = (p['owner'] as string)   || (p['owner_id'] as string) || '—';

  return {
    id:          r.id,
    name:        (p['deal_name'] as string) || r.displayName || 'Sin nombre',
    company,
    companyColor: pickColor(company, COMPANY_COLORS),
    value:       Number(p['value'] ?? p['amount'] ?? 0),
    probability: Number(p['probability'] ?? 0),
    stage,
    owner,
    ownerColor:  pickColor(owner, OWNER_COLORS),
    closeDate:   (p['close_date'] as string) || new Date().toISOString(),
    source:      (p['source'] as string) || (p['lead_source'] as string) || '—',
    notes:       (p['notes'] as string) || (p['description'] as string) || undefined,
  };
}

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
// Activity Section
// ---------------------------------------------------------------------------

type ActivityType = 'NOTE' | 'CALL' | 'MEETING';

interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  date: string;
  created_by: string | null;
  created_at: string;
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  NOTE: '📝',
  CALL: '📞',
  MEETING: '🤝',
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  NOTE: 'Nota',
  CALL: 'Llamada',
  MEETING: 'Reunión',
};

const TODAY = new Date().toISOString().slice(0, 10);

interface AiSummaryResult {
  summary: string;
  generatedAt: string;
}

function ActivitySection({ dealId }: { dealId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [type, setType] = useState<ActivityType>('NOTE');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(TODAY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Summary state
  const [aiSummary, setAiSummary] = useState<AiSummaryResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchActivities = useCallback(() => {
    setLoadingList(true);
    fetch(`/api/crm/deals/${dealId}/activities`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: { results: Activity[] }) => setActivities(data.results ?? []))
      .catch(err => console.error('[ActivitySection] fetch failed:', err))
      .finally(() => setLoadingList(false));
  }, [dealId]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const handleAiSummary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch(`/api/crm/deals/${dealId}/ai-summary`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAiError((data as { error?: string }).error ?? 'Error al generar resumen');
        return;
      }
      const data = await res.json() as AiSummaryResult;
      setAiSummary(data);
    } catch {
      setAiError('Error de conexión');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError('La descripción es requerida'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/deals/${dealId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description: description.trim(), date }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Error al registrar actividad');
        return;
      }
      setDescription('');
      setDate(TODAY);
      setType('NOTE');
      fetchActivities();
    } catch {
      setError('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtActivityDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="rounded-xl bg-neutral-50 p-4 space-y-4">
      {/* Section header + AI button */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Actividad</p>
        <button
          type="button"
          onClick={handleAiSummary}
          disabled={aiLoading}
          className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          {aiLoading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600 inline-block" />
              Generando resumen...
            </>
          ) : (
            <>✨ Resumen IA</>
          )}
        </button>
      </div>

      {/* AI Summary result */}
      {aiError && (
        <p className="text-xs text-red-500">{aiError}</p>
      )}
      {aiSummary && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider mb-2">✨ Resumen generado por IA</p>
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{aiSummary.summary}</p>
          <div className="mt-3 flex items-center justify-between">
            {aiSummary.generatedAt && (
              <p className="text-[10px] text-indigo-400">
                Generado: {new Date(aiSummary.generatedAt).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <button
              type="button"
              onClick={handleAiSummary}
              disabled={aiLoading}
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
            >
              Regenerar
            </button>
          </div>
        </div>
      )}

      {/* Activity list */}
      <div className="space-y-2">
        {loadingList ? (
          <div className="flex justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-500" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-center text-xs text-neutral-400 py-4">Sin actividad registrada aún</p>
        ) : (
          activities.map(a => (
            <div key={a.id} className="flex gap-3 rounded-xl bg-white border border-neutral-100 p-3 shadow-sm">
              <span className="text-base leading-none mt-0.5">{ACTIVITY_ICONS[a.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">{ACTIVITY_LABELS[a.type]}</span>
                  <span className="text-[10px] text-neutral-400 shrink-0">{fmtActivityDate(a.date)}</span>
                </div>
                <p className="text-sm text-neutral-700 leading-snug break-words">{a.description}</p>
                {a.created_by && (
                  <p className="text-[10px] text-neutral-400 mt-1">{a.created_by}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log form */}
      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Registrar actividad</p>

        {/* Type segmented control */}
        <div className="flex rounded-lg border border-neutral-200 overflow-hidden bg-white text-xs font-semibold">
          {(['NOTE', 'CALL', 'MEETING'] as ActivityType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 transition-colors ${
                type === t ? 'bg-primary-500 text-white' : 'text-neutral-500 hover:bg-neutral-50'
              }`}
            >
              {ACTIVITY_ICONS[t]} {ACTIVITY_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción..."
          rows={3}
          required
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-300 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
        />

        {/* Date */}
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
        />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Registrando…' : 'Registrar'}
        </button>
      </form>
    </div>
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

        {/* Activity log */}
        <ActivitySection dealId={deal.id} />

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

interface NewDealForm {
  deal_name: string;
  company: string;
  value: string;
  probability: string;
  close_date: string;
  stage: Stage;
}

const EMPTY_FORM: NewDealForm = {
  deal_name: '',
  company: '',
  value: '',
  probability: '50',
  close_date: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  stage: 'prospecto',
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [loading, setLoading] = useState(true);
  const [ownerFilter, setOwnerFilter] = useState('Todos');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDealForm, setNewDealForm] = useState<NewDealForm>(EMPTY_FORM);
  const [savingDeal, setSavingDeal] = useState(false);
  const [newDealError, setNewDealError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/crm/deals?limit=200')
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then((data: { results: BackendDeal[] }) => {
        if (!cancelled) setDeals((data.results ?? []).map(mapBackendDeal));
      })
      .catch(err => console.error('[DealsPage] fetch failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() =>
    ownerFilter === 'Todos' ? deals : deals.filter(d => d.owner === ownerFilter),
    [deals, ownerFilter]
  );

  const moveStage = (id: string, newStage: Stage) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: newStage } : d));
    if (selectedDeal?.id === id) setSelectedDeal(prev => prev ? { ...prev, stage: newStage } : null);
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealForm.deal_name.trim()) { setNewDealError('El nombre es requerido'); return; }
    setSavingDeal(true);
    setNewDealError(null);
    try {
      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: {
            deal_name:   { value: newDealForm.deal_name.trim() },
            company:     { value: newDealForm.company.trim() },
            value:       { value: parseFloat(newDealForm.value) || 0 },
            probability: { value: parseInt(newDealForm.probability) || 50 },
            close_date:  { value: newDealForm.close_date },
            stage:       { value: newDealForm.stage },
          },
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const created: BackendDeal = await res.json();
      setDeals(prev => [mapBackendDeal(created), ...prev]);
      setShowNewDeal(false);
      setNewDealForm(EMPTY_FORM);
    } catch (err: unknown) {
      setNewDealError(err instanceof Error ? err.message : 'Error al crear deal');
    } finally {
      setSavingDeal(false);
    }
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
            <button
              onClick={() => { setShowNewDeal(true); setNewDealError(null); }}
              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1v10M1 6h10"/></svg>
              Nuevo deal
            </button>
          </div>
        </div>

        {/* Kanban Board (horizontal scroll) */}
        <div className="flex-1 overflow-x-auto min-h-0 px-6 pb-6">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        )}
        {!loading && <>
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
        </>}
        </div>
      </motion.div>

      {/* New Deal Modal */}
      <AnimatePresence>
        {showNewDeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
            onClick={() => setShowNewDeal(false)}
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleCreateDeal}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-neutral-900">Nuevo deal</h2>
                <button type="button" onClick={() => setShowNewDeal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                </button>
              </div>

              <div className="space-y-3">
                <input
                  required
                  placeholder="Nombre del deal *"
                  value={newDealForm.deal_name}
                  onChange={e => setNewDealForm(p => ({ ...p, deal_name: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <input
                  placeholder="Empresa"
                  value={newDealForm.company}
                  onChange={e => setNewDealForm(p => ({ ...p, company: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Valor ($)"
                    value={newDealForm.value}
                    onChange={e => setNewDealForm(p => ({ ...p, value: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Probabilidad %"
                    value={newDealForm.probability}
                    onChange={e => setNewDealForm(p => ({ ...p, probability: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newDealForm.stage}
                    onChange={e => setNewDealForm(p => ({ ...p, stage: e.target.value as Stage }))}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 bg-white"
                  >
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  <input
                    type="date"
                    value={newDealForm.close_date}
                    onChange={e => setNewDealForm(p => ({ ...p, close_date: e.target.value }))}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  />
                </div>
              </div>

              {newDealError && <p className="text-xs text-red-500">{newDealError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingDeal}
                  className="flex-1 rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {savingDeal ? 'Guardando…' : 'Crear deal'}
                </button>
                <button type="button" onClick={() => setShowNewDeal(false)} className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

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
