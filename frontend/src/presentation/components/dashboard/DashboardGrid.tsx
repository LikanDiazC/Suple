'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../animations/variants';
import DashboardCard from './DashboardCard';
import { useKPIData } from '../../../application/hooks/useKPIData';
import { tokens } from '../../theme/tokens';

/**
 * ==========================================================================
 * Dashboard Grid
 * ==========================================================================
 *
 * Orchestrates the cascade reveal of 5-7 KPI cards following
 * the F-pattern layout principle from the research document.
 *
 * Layout:
 *   - Top row (2 cards): Primary KPIs (Revenue, Conversion Rate)
 *   - Middle row (3 cards): Operational KPIs (Pipeline, OTIF, Inventory)
 *   - Bottom row (2 cards): Secondary KPIs (Processes, Risk)
 *
 * Each card animates in sequence via staggerChildren, creating
 * a professional cascade reveal effect.
 * ==========================================================================
 */

interface DashboardKPIConfig {
  endpoint: string;
  label: string;
  accentColor: string;
  formatter?: (v: number) => string;
  onDrillDown?: () => void;
}

const KPI_CONFIG: DashboardKPIConfig[] = [
  {
    endpoint: '/api/erp/kpi/revenue',
    label: 'Revenue',
    accentColor: tokens.colors.primary[500],
    formatter: (v) => `$${(v / 1_000_000).toFixed(2)}M`,
  },
  {
    endpoint: '/api/crm/kpi/conversion-rate',
    label: 'Lead Conversion',
    accentColor: tokens.colors.success.base,
    formatter: (v) => `${v.toFixed(1)}%`,
  },
  {
    endpoint: '/api/crm/kpi/pipeline-velocity',
    label: 'Pipeline Velocity',
    accentColor: tokens.colors.info.base,
    formatter: (v) => `${v.toFixed(0)} days`,
  },
  {
    endpoint: '/api/scm/kpi/otif',
    label: 'OTIF Rate',
    accentColor: tokens.colors.success.base,
    formatter: (v) => `${v.toFixed(1)}%`,
  },
  {
    endpoint: '/api/scm/kpi/inventory-turnover',
    label: 'Inventory Turnover',
    accentColor: tokens.colors.warning.base,
    formatter: (v) => `${v.toFixed(2)}x`,
  },
  {
    endpoint: '/api/bpms/kpi/active-processes',
    label: 'Active Processes',
    accentColor: tokens.colors.primary[400],
  },
  {
    endpoint: '/api/scm/kpi/stockout-risk',
    label: 'Stockout Alerts',
    accentColor: tokens.colors.danger.base,
  },
];

function KPICard({ config }: { config: DashboardKPIConfig }) {
  const { data, isLoading } = useKPIData({
    endpoint: config.endpoint,
    pollingIntervalMs: 30000,
  });

  // Provide fallback data for rendering while loading
  const cardData = data ?? {
    value: 0,
    previousValue: 0,
    label: config.label,
    unit: '',
    trend: 'flat' as const,
    trendPercent: 0,
    sparkline: [],
    updatedAt: new Date().toISOString(),
  };

  return (
    <motion.div variants={staggerItem}>
      <DashboardCard
        data={cardData}
        isLoading={isLoading}
        accentColor={config.accentColor}
        formatValue={config.formatter}
        onClick={config.onDrillDown}
      />
    </motion.div>
  );
}

export default function DashboardGrid() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {KPI_CONFIG.map((config) => (
        <KPICard key={config.endpoint} config={config} />
      ))}
    </motion.div>
  );
}
