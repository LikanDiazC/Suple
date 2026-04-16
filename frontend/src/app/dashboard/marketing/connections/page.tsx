'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { pageTransition, staggerContainer, staggerItem } from '../../../../presentation/animations/variants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform = 'META' | 'TIKTOK' | 'GOOGLE_ADS' | 'LINKEDIN';
type ConnectionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';

interface Connection {
  id: string;
  platform: Platform;
  adAccountId: string | null;
  adAccountName: string | null;
  status: ConnectionStatus;
  tokenExpiresAt: string | null;
  scopes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform SVG Icons
// ─────────────────────────────────────────────────────────────────────────────

function MetaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78c.27 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 10.86 4.42c1.56-1.56 2.44-3.67 2.44-5.88V8.73a8.19 8.19 0 0 0 4.78 1.53V6.81a4.85 4.85 0 0 1-1.64-.12z" fill="currentColor"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM6.84 20.452H3.834V9H6.84v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/>
    </svg>
  );
}

const PLATFORM_ICONS: Record<Platform, () => React.ReactElement> = {
  META: MetaIcon,
  GOOGLE_ADS: GoogleIcon,
  TIKTOK: TikTokIcon,
  LINKEDIN: LinkedInIcon,
};

// ─────────────────────────────────────────────────────────────────────────────
// Platform config
// ─────────────────────────────────────────────────────────────────────────────

interface PlatformConfig {
  label: string;
  slug: string;
  gradient: string;
  borderActive: string;
  description: string;
  features: string[];
}

const PLATFORMS: Record<Platform, PlatformConfig> = {
  META: {
    label: 'Meta',
    slug: 'meta',
    gradient: 'from-blue-500/10 to-blue-600/5',
    borderActive: 'border-blue-500/40',
    description: 'Facebook & Instagram Ads',
    features: ['Campanas', 'Conversions API', 'Audiencias'],
  },
  GOOGLE_ADS: {
    label: 'Google Ads',
    slug: 'google-ads',
    gradient: 'from-red-500/10 to-amber-500/5',
    borderActive: 'border-red-500/40',
    description: 'Search, Display & YouTube',
    features: ['Campanas', 'Conversiones Offline', 'Smart Bidding'],
  },
  TIKTOK: {
    label: 'TikTok',
    slug: 'tiktok',
    gradient: 'from-neutral-500/10 to-neutral-600/5',
    borderActive: 'border-neutral-400/40',
    description: 'TikTok for Business',
    features: ['Campanas', 'Events API', 'Audiencias'],
  },
  LINKEDIN: {
    label: 'LinkedIn',
    slug: 'linkedin',
    gradient: 'from-sky-500/10 to-blue-600/5',
    borderActive: 'border-sky-500/40',
    description: 'Advertising & Conversions',
    features: ['Campanas', 'Conversions API', 'Lead Gen'],
  },
};

const ALL_PLATFORMS: Platform[] = ['META', 'GOOGLE_ADS', 'TIKTOK', 'LINKEDIN'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days}d`;
  return `hace ${Math.floor(days / 30)}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MarketingConnectionsPage() {
  return (
    <Suspense fallback={<div className="p-6 animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-neutral-100" /><div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{[1,2,3,4].map(i => <div key={i} className="h-44 rounded-xl bg-neutral-100" />)}</div></div>}>
      <ConnectionsContent />
    </Suspense>
  );
}

function ConnectionsContent() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/marketing/connections');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConnections(data.connections ?? []);
    } catch {
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) {
      const cfg = Object.values(PLATFORMS).find((p) => p.slug === connected);
      setToast({ type: 'success', message: `${cfg?.label ?? connected} conectado exitosamente` });
    } else if (error) {
      setToast({ type: 'error', message: error });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleConnect = (slug: string) => {
    window.location.href = `/api/marketing/oauth/${slug}`;
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const res = await fetch('/api/marketing/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      });
      if (!res.ok) throw new Error('Failed');
      setToast({ type: 'success', message: 'Plataforma desconectada' });
      fetchConnections();
    } catch {
      setToast({ type: 'error', message: 'Error al desconectar' });
    }
  };

  const connByPlatform = new Map<Platform, Connection>();
  for (const c of connections) {
    const existing = connByPlatform.get(c.platform);
    if (!existing || (c.status === 'ACTIVE' && existing.status !== 'ACTIVE')) {
      connByPlatform.set(c.platform, c);
    }
  }

  const activeCount = [...connByPlatform.values()].filter(c => c.status === 'ACTIVE').length;

  return (
    <motion.div className="p-6 space-y-6" {...pageTransition}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
          <Link href="/dashboard/marketing/campaigns" className="hover:text-neutral-600 transition-colors">Marketing</Link>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-600">Conexiones</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Plataformas de Marketing</h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {activeCount > 0
                ? `${activeCount} de ${ALL_PLATFORMS.length} plataformas conectadas`
                : 'Conecta tus cuentas publicitarias para importar datos reales'}
            </p>
          </div>
          {activeCount > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-emerald-700">{activeCount} activas</span>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className={`rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{toast.type === 'success' ? '✓' : '!'}</span>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-neutral-100 border border-neutral-200" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {ALL_PLATFORMS.map((platform) => {
            const cfg = PLATFORMS[platform];
            const conn = connByPlatform.get(platform);
            const isConnected = conn?.status === 'ACTIVE';
            const isExpired = conn?.status === 'EXPIRED';
            const Icon = PLATFORM_ICONS[platform];

            return (
              <motion.div
                key={platform}
                variants={staggerItem}
                className={`group relative rounded-xl border bg-white overflow-hidden transition-all hover:shadow-md ${
                  isConnected
                    ? `${cfg.borderActive} shadow-sm`
                    : isExpired
                    ? 'border-amber-300'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {/* Gradient top accent */}
                <div className={`h-1 bg-gradient-to-r ${cfg.gradient}`} style={{ opacity: isConnected ? 1 : 0.4 }} />

                <div className="p-5">
                  {/* Top row: icon + name + status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${cfg.gradient} border border-neutral-100`}>
                        <Icon />
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 text-sm">{cfg.label}</h3>
                        <p className="text-xs text-neutral-500">{cfg.description}</p>
                      </div>
                    </div>

                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Conectado
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Expirado
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-500">
                        Sin conectar
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {cfg.features.map((f) => (
                      <span key={f} className="rounded-md bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-500 border border-neutral-100">
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Connection info (when connected) */}
                  {conn && conn.status !== 'REVOKED' && (
                    <div className="flex items-center gap-4 text-[11px] text-neutral-400 mb-4">
                      {conn.adAccountName && (
                        <span className="flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="3" width="10" height="6" rx="1"/><path d="M1 5h10"/></svg>
                          {conn.adAccountName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="6" cy="6" r="4.5"/><path d="M6 3.5V6l2 1.5"/></svg>
                        {timeAgo(conn.createdAt)}
                      </span>
                      {conn.tokenExpiresAt && (
                        <span className={`flex items-center gap-1 ${isExpired ? 'text-amber-500' : ''}`}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M6 1v2M6 9v2M1 6h2M9 6h2"/><circle cx="6" cy="6" r="3"/></svg>
                          Expira {new Date(conn.tokenExpiresAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  {isConnected ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConnect(cfg.slug)}
                        className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                      >
                        Reconectar
                      </button>
                      <button
                        onClick={() => handleDisconnect(conn!.id)}
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        Desconectar
                      </button>
                    </div>
                  ) : isExpired ? (
                    <button
                      onClick={() => handleConnect(cfg.slug)}
                      className="w-full rounded-lg bg-amber-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-amber-400 transition-colors shadow-sm"
                    >
                      Renovar conexion
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(cfg.slug)}
                      className="w-full rounded-lg bg-primary-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm"
                    >
                      Conectar {cfg.label}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* How it works */}
      <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-800 mb-3">Como funciona</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { step: '1', title: 'Conectar', desc: 'Autoriza Suple en tu cuenta publicitaria con OAuth seguro.' },
            { step: '2', title: 'Sincronizar', desc: 'Campanas, gastos y conversiones se importan automaticamente.' },
            { step: '3', title: 'Tracking', desc: 'Envia eventos de conversion (CAPI) a todas las plataformas a la vez.' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                {item.step}
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-700">{item.title}</p>
                <p className="text-[11px] text-neutral-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
