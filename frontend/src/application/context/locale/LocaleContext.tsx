'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, type TranslationKey } from '../../i18n/translations';

export type AppLocale = 'es' | 'en' | 'pt';
export type AppTimezone = 'America/Santiago' | 'UTC' | 'America/New_York' | 'Europe/Madrid';

interface LocaleContextValue {
  locale: AppLocale;
  timezone: AppTimezone;
  setLocale: (l: AppLocale) => void;
  setTimezone: (tz: AppTimezone) => void;
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDatetime: (date: string | Date) => string;
}

const LOCALE_KEY = 'suple_locale';
const TZ_KEY = 'suple_timezone';

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const LOCALE_INTL: Record<AppLocale, string> = {
  es: 'es-CL',
  en: 'en-US',
  pt: 'pt-BR',
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('es');
  const [timezone, setTimezoneState] = useState<AppTimezone>('America/Santiago');

  useEffect(() => {
    const storedLocale = localStorage.getItem(LOCALE_KEY) as AppLocale | null;
    const storedTz = localStorage.getItem(TZ_KEY) as AppTimezone | null;
    if (storedLocale) setLocaleState(storedLocale);
    if (storedTz) setTimezoneState(storedTz);
  }, []);

  const setLocale = (l: AppLocale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
  };

  const setTimezone = (tz: AppTimezone) => {
    setTimezoneState(tz);
    localStorage.setItem(TZ_KEY, tz);
  };

  const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(LOCALE_INTL[locale], {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options,
    }).format(d);
  };

  const formatDatetime = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(LOCALE_INTL[locale], {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  return (
    <LocaleContext.Provider value={{ locale, timezone, setLocale, setTimezone, formatDate, formatDatetime }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}

export function useTranslation() {
  const { locale } = useLocale();
  const t = (key: TranslationKey): string =>
    translations[locale]?.[key] ?? translations['es'][key];
  return { t };
}
