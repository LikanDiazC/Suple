'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Currency = 'CLP' | 'USD' | 'EUR';

interface CurrencyConfig {
  symbol: string;
  locale: string;
  decimals: number;
}

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /** Full format: "$1.234.567" */
  fmt: (n: number) => string;
  /** Abbreviated: "$12,3M" */
  fmtShort: (n: number) => string;
  /** Currency code: "CLP" */
  code: Currency;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIGS: Record<Currency, CurrencyConfig> = {
  CLP: { symbol: '$',   locale: 'es-CL', decimals: 0 },
  USD: { symbol: 'US$', locale: 'en-US',  decimals: 0 },
  EUR: { symbol: '\u20AC',   locale: 'de-DE',  decimals: 0 },
};

// ---------------------------------------------------------------------------
// Formatting functions
// ---------------------------------------------------------------------------

function formatFull(n: number, currency: Currency): string {
  const cfg = CONFIGS[currency];
  const numStr = new Intl.NumberFormat(cfg.locale, {
    maximumFractionDigits: cfg.decimals,
    minimumFractionDigits: 0,
  }).format(Math.abs(n));
  const sign = n < 0 ? '-' : '';
  return `${sign}${cfg.symbol}${numStr}`;
}

function formatShort(n: number, currency: Currency): string {
  const cfg = CONFIGS[currency];
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    const numStr = v.toLocaleString(cfg.locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    return `${sign}${cfg.symbol}${numStr}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    const numStr = v.toLocaleString(cfg.locale, { maximumFractionDigits: 0 });
    return `${sign}${cfg.symbol}${numStr}K`;
  }
  return formatFull(n, currency);
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'app_currency';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('CLP');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (stored && CONFIGS[stored]) setCurrencyState(stored);
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const fmt = useCallback((n: number) => formatFull(n, currency), [currency]);
  const fmtShort = useCallback((n: number) => formatShort(n, currency), [currency]);

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, fmt, fmtShort, code: currency }),
    [currency, setCurrency, fmt, fmtShort],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// <M> Component — renders money value + small grey currency suffix
//
// Usage: <M v={1234567} />       → "$1.234.567 CLP"
//        <M v={1234567} short /> → "$1,2M CLP"
// ---------------------------------------------------------------------------

export function M({ v, short, className }: { v: number; short?: boolean; className?: string }) {
  const { fmt, fmtShort, code } = useCurrency();
  return (
    <span className={className}>
      {short ? fmtShort(v) : fmt(v)}
      <span className="ml-0.5 text-[0.65em] font-normal text-neutral-400">{code}</span>
    </span>
  );
}
