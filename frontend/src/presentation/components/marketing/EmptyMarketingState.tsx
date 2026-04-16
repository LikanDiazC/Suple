'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface EmptyMarketingStateProps {
  title: string;
  description?: string;
}

/**
 * Empty state shown in marketing pages when the user is in authenticated
 * mode but has no real marketing data (no platforms connected).
 *
 * In demo mode these pages show hardcoded sample data instead.
 */
export default function EmptyMarketingState({ title, description }: EmptyMarketingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 px-6"
    >
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 mb-5">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="14" cy="14" r="12" />
          <path d="M14 9v6M14 19h.01" />
        </svg>
      </div>

      {/* Text */}
      <h2 className="text-lg font-semibold text-neutral-800 mb-1">{title}</h2>
      <p className="text-sm text-neutral-500 text-center max-w-md mb-6">
        {description ?? 'Conecta al menos una plataforma de marketing para ver datos reales en esta seccion.'}
      </p>

      {/* CTA */}
      <Link
        href="/dashboard/marketing/connections"
        className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-600 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
        Conectar plataformas
      </Link>

      <p className="mt-4 text-xs text-neutral-400">
        Tambien puedes usar el <Link href="/login" className="underline hover:text-neutral-600">modo demo</Link> para explorar con datos de ejemplo.
      </p>
    </motion.div>
  );
}
