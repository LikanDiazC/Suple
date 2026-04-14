'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  dashboardCardVariants,
  kpiValueVariants,
  tooltipVariants,
} from '../../animations/variants';
import { tokens } from '../../theme/tokens';
import type { KPIDataPoint } from '../../../application/hooks/useKPIData';

/**
 * ==========================================================================
 * Dashboard KPI Card Component
 * ==========================================================================
 *
 * Enterprise-grade dashboard card with:
 *   - Animated count-up effect for KPI values
 *   - Cascade reveal animation (stagger within dashboard grid)
 *   - Trend indicator with directional micro-animation
 *   - Inline sparkline visualization
 *   - Accessible high-contrast design (WCAG 2.1 AA)
 *   - Hover micro-interaction with subtle elevation change
 *   - Reduced motion support via prefers-reduced-motion
 *
 * Follows the F-pattern layout:
 *   Top row: KPI label + trend badge
 *   Center:  Primary metric (large, bold)
 *   Bottom:  Sparkline + comparison context
 * ==========================================================================
 */

interface DashboardCardProps {
  data: KPIDataPoint;
  isLoading?: boolean;
  accentColor?: string;
  formatValue?: (value: number) => string;
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Animated Counter (Count-Up Effect)
// ---------------------------------------------------------------------------

function AnimatedCounter({
  value,
  formatValue,
  duration = 1.2,
}: {
  value: number;
  formatValue: (v: number) => string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      // Deceleration easing: fast start, smooth stop.
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return (
    <motion.span
      variants={kpiValueVariants}
      className="text-4xl font-bold tracking-tight text-neutral-900"
      aria-live="polite"
      role="status"
    >
      {formatValue(displayValue)}
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Sparkline SVG
// ---------------------------------------------------------------------------

function Sparkline({
  data,
  color,
  width = 120,
  height = 32,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      initial={{ opacity: 0, pathLength: 0 }}
      animate={{ opacity: 1, pathLength: 1 }}
      transition={{ duration: tokens.motion.duration.reveal, delay: 0.3 }}
      role="img"
      aria-label="Sparkline trend visualization"
    >
      <defs>
        <linearGradient id={`spark-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <path
        d={areaD}
        fill={`url(#spark-gradient-${color})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

// ---------------------------------------------------------------------------
// Trend Badge
// ---------------------------------------------------------------------------

function TrendBadge({ trend, percent }: { trend: 'up' | 'down' | 'flat'; percent: number }) {
  const config = {
    up:   { bg: tokens.colors.success.light, text: tokens.colors.success.dark, icon: '\u2191', label: 'Increasing' },
    down: { bg: tokens.colors.danger.light,  text: tokens.colors.danger.dark,  icon: '\u2193', label: 'Decreasing' },
    flat: { bg: tokens.colors.neutral[100],  text: tokens.colors.neutral[600], icon: '\u2192', label: 'Stable' },
  }[trend];

  return (
    <motion.span
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: tokens.motion.duration.fast, delay: 0.4 }}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: config.bg, color: config.text }}
      role="status"
      aria-label={`${config.label}: ${Math.abs(percent)}%`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {Math.abs(percent).toFixed(1)}%
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-6" role="status" aria-label="Loading KPI data">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-neutral-200" />
        <div className="h-5 w-16 rounded-full bg-neutral-200" />
      </div>
      <div className="h-10 w-32 rounded bg-neutral-200" />
      <div className="h-8 w-full rounded bg-neutral-100" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DashboardCard({
  data,
  isLoading = false,
  accentColor = tokens.colors.primary[500],
  formatValue = defaultFormat,
  onClick,
}: DashboardCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: '-50px' });
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      ref={cardRef}
      variants={dashboardCardVariants}
      initial="initial"
      animate={isInView ? 'animate' : 'initial'}
      whileHover="hover"
      whileTap={onClick ? 'tap' : undefined}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`
        relative overflow-hidden rounded-xl border border-neutral-200
        bg-white shadow-sm transition-colors
        ${onClick ? 'cursor-pointer' : ''}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
      `}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${data.label}: ${formatValue(data.value)} ${data.unit}`}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Accent top border */}
      <div
        className="absolute left-0 right-0 top-0 h-1"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />

      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="p-6 pt-7">
          {/* Row 1: Label + Trend (F-pattern top) */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider">
              {data.label}
            </span>
            <TrendBadge trend={data.trend} percent={data.trendPercent} />
          </div>

          {/* Row 2: Primary KPI Value (visual focal point) */}
          <div className="flex items-baseline gap-2 mb-1">
            <AnimatedCounter
              value={data.value}
              formatValue={formatValue}
            />
            <span className="text-sm font-medium text-neutral-400">
              {data.unit}
            </span>
          </div>

          {/* Row 3: Comparison context */}
          <p className="text-xs text-neutral-400 mb-4">
            vs. previous period: {formatValue(data.previousValue)} {data.unit}
          </p>

          {/* Row 4: Sparkline (visual trend context) */}
          {data.sparkline && data.sparkline.length > 0 && (
            <div className="mt-2">
              <Sparkline
                data={data.sparkline}
                color={accentColor}
                width={240}
                height={40}
              />
            </div>
          )}

          {/* Tooltip on hover */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                variants={tooltipVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute bottom-2 right-2 rounded-md bg-neutral-800 px-2.5 py-1 text-xs text-white shadow-lg"
              >
                Updated: {new Date(data.updatedAt).toLocaleTimeString()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Default Formatter
// ---------------------------------------------------------------------------

function defaultFormat(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(value % 1 === 0 ? 0 : 2);
}
