'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * ==========================================================================
 * KPI Data Hook
 * ==========================================================================
 *
 * Custom hook for fetching and managing KPI data from the backend.
 * Implements:
 *   - Automatic polling at configurable intervals
 *   - Abort controller for cleanup on unmount
 *   - Stale-while-revalidate pattern
 *   - Trend calculation (delta from previous value)
 * ==========================================================================
 */

export interface KPIDataPoint {
  value: number;
  previousValue: number;
  label: string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendPercent: number;
  sparkline?: number[];
  updatedAt: string;
}

interface UseKPIDataOptions {
  endpoint: string;
  pollingIntervalMs?: number;
  enabled?: boolean;
}

interface UseKPIDataResult {
  data: KPIDataPoint | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useKPIData(options: UseKPIDataOptions): UseKPIDataResult {
  const { endpoint, pollingIntervalMs = 30000, enabled = true } = options;

  const [data, setData] = useState<KPIDataPoint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading((prev) => !data ? true : prev); // Only show loading on initial fetch

      const token = typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.json();

      const trend: 'up' | 'down' | 'flat' =
        raw.value > raw.previousValue ? 'up' :
        raw.value < raw.previousValue ? 'down' : 'flat';

      const trendPercent = raw.previousValue !== 0
        ? ((raw.value - raw.previousValue) / Math.abs(raw.previousValue)) * 100
        : 0;

      setData({
        value: raw.value,
        previousValue: raw.previousValue,
        label: raw.label,
        unit: raw.unit,
        trend,
        trendPercent: Math.round(trendPercent * 10) / 10,
        sparkline: raw.sparkline,
        updatedAt: raw.updatedAt ?? new Date().toISOString(),
      });

      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to fetch KPI data');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, enabled, data]);

  useEffect(() => {
    fetchData();
    if (!enabled || pollingIntervalMs <= 0) return;

    const interval = setInterval(fetchData, pollingIntervalMs);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchData, pollingIntervalMs, enabled]);

  return { data, isLoading, error, refetch: fetchData };
}
