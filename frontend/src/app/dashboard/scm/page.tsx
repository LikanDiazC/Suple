'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import TopBar from '../../../presentation/components/layout/TopBar';
import { pageTransition, staggerContainer, staggerItem } from '../../../presentation/animations/variants';
import { tokens } from '../../../presentation/theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// What-If Simulator types (preserved from original page)
// ─────────────────────────────────────────────────────────────────────────────

interface InventoryItem {
  sku: string;
  name: string;
  stock: number;
  reorderPoint: number;
  dailyDemand: number;
  daysOfSupply: number;
  turnover: number;
  risk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

const MOCK_INVENTORY: InventoryItem[] = [
  { sku: 'SKU-001', name: 'Server Rack Unit A',   stock: 245,  reorderPoint: 80,  dailyDemand: 5.2,  daysOfSupply: 47, turnover: 8.4,  risk: 'LOW' },
  { sku: 'SKU-002', name: 'Network Switch 48P',   stock: 38,   reorderPoint: 45,  dailyDemand: 3.1,  daysOfSupply: 12, turnover: 11.2, risk: 'HIGH' },
  { sku: 'SKU-003', name: 'SSD 2TB Pro',   stock: 512,  reorderPoint: 200, dailyDemand: 8.7,  daysOfSupply: 59, turnover: 6.1,  risk: 'LOW' },
  { sku: 'SKU-004', name: 'UPS Battery Module',   stock: 15,   reorderPoint: 30,  dailyDemand: 2.4,  daysOfSupply: 6,  turnover: 14.8, risk: 'CRITICAL' },
  { sku: 'SKU-005', name: 'Cat6a Cable Spool',    stock: 89,   reorderPoint: 60,  dailyDemand: 4.5,  daysOfSupply: 20, turnover: 9.3,  risk: 'MODERATE' },
  { sku: 'SKU-006', name: 'Fiber Patch Panel',    stock: 167,  reorderPoint: 50,  dailyDemand: 2.8,  daysOfSupply: 60, turnover: 5.6,  risk: 'LOW' },
];

interface WhatIfState {
  demandMultiplier: number;
  leadTimeDays: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine status type
// ─────────────────────────────────────────────────────────────────────────────

type EngineStatus = 'connecting' | 'online' | 'offline';

// ─────────────────────────────────────────────────────────────────────────────
// KPI stats type
// ─────────────────────────────────────────────────────────────────────────────

interface KpiStats {
  availableBoards: number;
  availableOffcuts: number;
  totalAreaM2: number;
  activeWorkOrders: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline SVG icons
// ─────────────────────────────────────────────────────────────────────────────

function IconClipboardList() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}

function IconBoxes() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
      <path d="m7 16.5-4.74-2.85M7 16.5l5-3M7 16.5v5.17M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
      <path d="m17 16.5-5-3M17 16.5l4.74-2.85M17 16.5v5.17M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
      <path d="M12 8 7.26 5.15M12 8l4.74-2.85M12 8v4.5" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SCMPage() {
  const router = useRouter();

  // ── What-If state ──
  const [whatIf, setWhatIf] = useState<WhatIfState>({ demandMultiplier: 1.0, leadTimeDays: 14 });
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  // ── Engine status ──
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('connecting');

  // ── KPI stats ──
  const [kpiStats, setKpiStats] = useState<KpiStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // ── Check engine status ──
  useEffect(() => {
    let cancelled = false;
    async function checkEngine() {
      try {
        const res = await fetch('/api/scm/status');
        if (!cancelled) {
          setEngineStatus(res.ok ? 'online' : 'offline');
        }
      } catch {
        if (!cancelled) setEngineStatus('offline');
      }
    }
    checkEngine();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch KPI stats ──
  useEffect(() => {
    let cancelled = false;
    async function fetchStats() {
      setIsLoadingStats(true);
      try {
        const [inventoryRes, workOrdersRes] = await Promise.all([
          fetch('/api/scm/inventory'),
          fetch('/api/scm/work-orders'),
        ]);

        if (!inventoryRes.ok || !workOrdersRes.ok) throw new Error('Fetch failed');

        const inventory = await inventoryRes.json();
        const workOrdersData = await workOrdersRes.json();

        if (cancelled) return;

        const boards: Array<{ status: string; widthMm: number; heightMm: number }> = inventory.boards ?? [];
        const offcuts: Array<{ status: string; widthMm: number; heightMm: number }> = inventory.offcuts ?? [];
        const workOrders: Array<{ status: string }> = workOrdersData.items ?? workOrdersData ?? [];

        const availableBoards = boards.filter((b) => b.status === 'AVAILABLE').length;
        const availableOffcuts = offcuts.filter((o) => o.status === 'AVAILABLE').length;
        const totalAreaMm2 = boards
          .filter((b) => b.status === 'AVAILABLE')
          .reduce((sum, b) => sum + b.widthMm * b.heightMm, 0);
        const totalAreaM2 = totalAreaMm2 / 1_000_000;
        const activeWorkOrders = workOrders.filter(
          (wo) => wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED',
        ).length;

        setKpiStats({ availableBoards, availableOffcuts, totalAreaM2, activeWorkOrders });
      } catch {
        if (!cancelled) setKpiStats(null);
      } finally {
        if (!cancelled) setIsLoadingStats(false);
      }
    }
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  // ── What-If helpers ──
  const riskColors: Record<string, { bg: string; text: string }> = {
    LOW:      { bg: 'bg-green-50', text: 'text-green-700' },
    MODERATE: { bg: 'bg-amber-50', text: 'text-amber-700' },
    HIGH:     { bg: 'bg-orange-50', text: 'text-orange-700' },
    CRITICAL: { bg: 'bg-red-50', text: 'text-red-700' },
  };

  const simulateWhatIf = (item: InventoryItem) => {
    const adjustedDemand = item.dailyDemand * whatIf.demandMultiplier;
    const newDays = adjustedDemand > 0 ? Math.floor(item.stock / adjustedDemand) : 999;
    const orderQty = Math.max(0, Math.ceil(adjustedDemand * (whatIf.leadTimeDays + 30) - item.stock));
    return { newDays, orderQty, adjustedDemand: Math.round(adjustedDemand * 10) / 10 };
  };

  // ── Engine status pill ──
  const enginePill =
    engineStatus === 'connecting'
      ? { label: 'Conectando...', classes: 'bg-amber-50 text-amber-700 border border-amber-200' }
      : engineStatus === 'online'
      ? { label: 'En línea', classes: 'bg-green-50 text-green-700 border border-green-200' }
      : { label: 'Fuera de línea', classes: 'bg-red-50 text-red-600 border border-red-200' };

  // ── Quick action cards ──
  const quickActions = [
    {
      title: 'Órdenes de Trabajo',
      subtitle: 'Ver, crear y gestionar órdenes de corte',
      icon: <IconClipboardList />,
      iconBg: 'bg-primary-50 text-primary-600',
      action: () => router.push('/dashboard/scm/work-orders'),
      buttonLabel: 'Abrir módulo',
      buttonClass:
        'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700',
    },
    {
      title: 'Inventario',
      subtitle: 'Planchas y retazos disponibles',
      icon: <IconBoxes />,
      iconBg: 'bg-green-50 text-green-700',
      action: () => router.push('/dashboard/scm/inventory'),
      buttonLabel: 'Ver inventario',
      buttonClass:
        'bg-green-600 text-white hover:bg-green-700 active:bg-green-800',
    },
  ];

  // ── KPI card definitions ──
  const kpiCards = [
    {
      label: 'Planchas disponibles',
      value: isLoadingStats ? null : (kpiStats?.availableBoards ?? '—'),
      sub: 'Stock AVAILABLE',
      color: 'bg-primary-500',
    },
    {
      label: 'Retazos disponibles',
      value: isLoadingStats ? null : (kpiStats?.availableOffcuts ?? '—'),
      sub: 'Stock AVAILABLE',
      color: 'bg-green-500',
    },
    {
      label: 'Área total en stock',
      value: isLoadingStats
        ? null
        : kpiStats != null
        ? `${kpiStats.totalAreaM2.toFixed(2)} m²`
        : '—',
      sub: 'Planchas disponibles',
      color: 'bg-amber-500',
    },
    {
      label: 'Órdenes activas',
      value: isLoadingStats ? null : (kpiStats?.activeWorkOrders ?? '—'),
      sub: 'Sin completar ni cancelar',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <>
      <TopBar
        title="SCM · MRP"
        subtitle="Supply Chain Management — Gestión de Inventario y Corte"
      />

      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="p-8"
      >
        {/* ── Section 1: Quick Actions ── */}
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Acciones rápidas
        </h2>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {/* Card: Órdenes de Trabajo */}
          <motion.div
            variants={staggerItem}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col"
          >
            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${quickActions[0].iconBg}`}>
              {quickActions[0].icon}
            </div>
            <h3 className="mb-1 text-sm font-semibold text-neutral-800">{quickActions[0].title}</h3>
            <p className="mb-5 text-xs text-neutral-500 flex-1">{quickActions[0].subtitle}</p>
            <button
              onClick={quickActions[0].action}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${quickActions[0].buttonClass}`}
            >
              {quickActions[0].buttonLabel}
            </button>
          </motion.div>

          {/* Card: Inventario */}
          <motion.div
            variants={staggerItem}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col"
          >
            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${quickActions[1].iconBg}`}>
              {quickActions[1].icon}
            </div>
            <h3 className="mb-1 text-sm font-semibold text-neutral-800">{quickActions[1].title}</h3>
            <p className="mb-5 text-xs text-neutral-500 flex-1">{quickActions[1].subtitle}</p>
            <button
              onClick={quickActions[1].action}
              className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${quickActions[1].buttonClass}`}
            >
              {quickActions[1].buttonLabel}
            </button>
          </motion.div>

          {/* Card: Motor de Corte (status only) */}
          <motion.div
            variants={staggerItem}
            className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <IconCpu />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-neutral-800">Motor de Corte</h3>
            <p className="mb-5 text-xs text-neutral-500 flex-1">
              Estado del servicio de optimización
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${enginePill.classes}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    engineStatus === 'connecting'
                      ? 'bg-amber-500'
                      : engineStatus === 'online'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                {enginePill.label}
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* ── Section 2: KPI Stats ── */}
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Estadísticas rápidas
        </h2>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpiCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                {card.label}
              </p>
              {card.value === null ? (
                <div className="mt-2 h-7 w-20 animate-pulse rounded-md bg-neutral-200" />
              ) : (
                <p className="mt-1 text-2xl font-bold text-neutral-900">
                  {card.value}
                </p>
              )}
              <p className="mt-1 text-[10px] text-neutral-400">{card.sub}</p>
              <div className={`mt-3 h-1 w-10 rounded-full ${card.color}`} />
            </motion.div>
          ))}
        </div>

        {/* ── Section 3: What-If Simulator (preserved) ── */}
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Simulador What-If
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-neutral-800 mb-4">
            What-If Scenario Simulator
          </h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-2">
                Demand Multiplier:{' '}
                <span className="font-bold text-neutral-800">
                  {whatIf.demandMultiplier.toFixed(1)}x
                </span>
                {whatIf.demandMultiplier > 1 && (
                  <span
                    className="ml-2"
                    style={{ color: tokens.colors.warning.dark }}
                  >
                    (+{((whatIf.demandMultiplier - 1) * 100).toFixed(0)}% demand increase)
                  </span>
                )}
              </label>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={whatIf.demandMultiplier}
                onChange={(e) =>
                  setWhatIf((s) => ({ ...s, demandMultiplier: parseFloat(e.target.value) }))
                }
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>0.5x</span>
                <span>1.0x (baseline)</span>
                <span>3.0x</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-2">
                Supplier Lead Time:{' '}
                <span className="font-bold text-neutral-800">
                  {whatIf.leadTimeDays} days
                </span>
              </label>
              <input
                type="range"
                min="3"
                max="60"
                step="1"
                value={whatIf.leadTimeDays}
                onChange={(e) =>
                  setWhatIf((s) => ({ ...s, leadTimeDays: parseInt(e.target.value) }))
                }
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>3 days</span>
                <span>30 days</span>
                <span>60 days</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Inventory Table */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">SKU</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Product</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Stock</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Daily Demand</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Days of Supply</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Turnover</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Risk</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Rec. Order Qty</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVENTORY.map((item) => {
                const sim = simulateWhatIf(item);
                const simRisk =
                  sim.newDays < 7
                    ? 'CRITICAL'
                    : sim.newDays < 14
                    ? 'HIGH'
                    : sim.newDays < 30
                    ? 'MODERATE'
                    : 'LOW';
                const rc = riskColors[simRisk];
                return (
                  <motion.tr
                    key={item.sku}
                    variants={staggerItem}
                    className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedSku(selectedSku === item.sku ? null : item.sku)}
                  >
                    <td className="px-6 py-4 text-sm font-mono font-medium text-primary-600">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-800">{item.name}</td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-neutral-700">
                      {item.stock.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-neutral-600">
                      {sim.adjustedDemand}/day
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-mono text-sm font-semibold ${
                          sim.newDays < 14 ? 'text-red-600' : 'text-neutral-700'
                        }`}
                      >
                        {sim.newDays}d
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-neutral-600">
                      {item.turnover}x
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${rc.bg} ${rc.text}`}
                      >
                        {simRisk}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono font-semibold text-neutral-800">
                      {sim.orderQty > 0 ? sim.orderQty.toLocaleString() : '-'}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      </motion.div>
    </>
  );
}
