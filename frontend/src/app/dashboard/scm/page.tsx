'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TopBar from '../../../presentation/components/layout/TopBar';
import { pageTransition, staggerContainer, staggerItem } from '../../../presentation/animations/variants';
import { tokens } from '../../../presentation/theme/tokens';

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
  { sku: 'SKU-003', name: 'SSD 2TB Enterprise',   stock: 512,  reorderPoint: 200, dailyDemand: 8.7,  daysOfSupply: 59, turnover: 6.1,  risk: 'LOW' },
  { sku: 'SKU-004', name: 'UPS Battery Module',   stock: 15,   reorderPoint: 30,  dailyDemand: 2.4,  daysOfSupply: 6,  turnover: 14.8, risk: 'CRITICAL' },
  { sku: 'SKU-005', name: 'Cat6a Cable Spool',    stock: 89,   reorderPoint: 60,  dailyDemand: 4.5,  daysOfSupply: 20, turnover: 9.3,  risk: 'MODERATE' },
  { sku: 'SKU-006', name: 'Fiber Patch Panel',    stock: 167,  reorderPoint: 50,  dailyDemand: 2.8,  daysOfSupply: 60, turnover: 5.6,  risk: 'LOW' },
];

// What-If scenario state
interface WhatIfState {
  demandMultiplier: number;
  leadTimeDays: number;
}

export default function SCMPage() {
  const [whatIf, setWhatIf] = useState<WhatIfState>({ demandMultiplier: 1.0, leadTimeDays: 14 });
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

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

  return (
    <>
      <TopBar title="SCM" subtitle="Supply Chain Management - Inventory & Forecasting" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-8">

        {/* What-If Panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-neutral-800 mb-4">What-If Scenario Simulator</h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-2">
                Demand Multiplier: <span className="font-bold text-neutral-800">{whatIf.demandMultiplier.toFixed(1)}x</span>
                {whatIf.demandMultiplier > 1 && (
                  <span className="ml-2 text-warning-600" style={{ color: tokens.colors.warning.dark }}>
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
                onChange={(e) => setWhatIf((s) => ({ ...s, demandMultiplier: parseFloat(e.target.value) }))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>0.5x</span><span>1.0x (baseline)</span><span>3.0x</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-2">
                Supplier Lead Time: <span className="font-bold text-neutral-800">{whatIf.leadTimeDays} days</span>
              </label>
              <input
                type="range"
                min="3"
                max="60"
                step="1"
                value={whatIf.leadTimeDays}
                onChange={(e) => setWhatIf((s) => ({ ...s, leadTimeDays: parseInt(e.target.value) }))}
                className="w-full accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                <span>3 days</span><span>30 days</span><span>60 days</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Inventory Table */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
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
                const simRisk = sim.newDays < 7 ? 'CRITICAL' : sim.newDays < 14 ? 'HIGH' : sim.newDays < 30 ? 'MODERATE' : 'LOW';
                const rc = riskColors[simRisk];
                return (
                  <motion.tr
                    key={item.sku}
                    variants={staggerItem}
                    className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedSku(selectedSku === item.sku ? null : item.sku)}
                  >
                    <td className="px-6 py-4 text-sm font-mono font-medium text-primary-600">{item.sku}</td>
                    <td className="px-6 py-4 text-sm text-neutral-800">{item.name}</td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-neutral-700">{item.stock.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-neutral-600">{sim.adjustedDemand}/day</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono text-sm font-semibold ${sim.newDays < 14 ? 'text-red-600' : 'text-neutral-700'}`}>
                        {sim.newDays}d
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-mono text-neutral-600">{item.turnover}x</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${rc.bg} ${rc.text}`}>
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
