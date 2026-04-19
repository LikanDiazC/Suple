'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '../../../presentation/animations/variants';
import { useCurrency, type Currency } from '../../../application/context/currency/CurrencyContext';
import { useLocale, useTranslation, type AppLocale, type AppTimezone } from '../../../application/context/locale/LocaleContext';

// ---------------------------------------------------------------------------
// Currency options
// ---------------------------------------------------------------------------

const CURRENCY_OPTIONS: { key: Currency; label: string; symbol: string; desc: string; example: string; flag: string }[] = [
  {
    key: 'CLP',
    label: 'Peso Chileno',
    symbol: '$',
    desc: 'Formato: $1.234.567',
    example: '$12.500.000',
    flag: 'CL',
  },
  {
    key: 'USD',
    label: 'Dólar Estadounidense',
    symbol: 'US$',
    desc: 'Formato: US$1,234,567',
    example: 'US$12,500,000',
    flag: 'US',
  },
  {
    key: 'EUR',
    label: 'Euro',
    symbol: '\u20AC',
    desc: 'Formato: \u20AC1.234.567',
    example: '\u20AC12.500.000',
    flag: 'EU',
  },
];

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface IamUser {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  role?: string;
  status?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Modal overlay animation
// ---------------------------------------------------------------------------

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, transition: { duration: 0.14 } },
};

const sheetVariants = {
  initial: { opacity: 0, scale: 0.97, y: 16 },
  animate: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
  exit:    { opacity: 0, scale: 0.97, y: 12, transition: { duration: 0.16 } },
};

// ---------------------------------------------------------------------------
// InvitarUsuarioModal
// ---------------------------------------------------------------------------

interface InviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function InvitarUsuarioModal({ onClose, onSuccess }: InviteModalProps) {
  const [email, setEmail]       = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole]         = useState('operator');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/iam/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, role }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `Error ${res.status}`);
        return;
      }
      onSuccess();
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  const inputBase =
    'w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-800 outline-none transition-all focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100';

  return (
    <motion.div
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        variants={sheetVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Gestión de accesos</p>
            <h3 className="mt-1 text-base font-bold text-neutral-900">Invitar usuario</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-600">
              Correo electrónico <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              className={inputBase}
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-600">
              Nombre completo
            </label>
            <input
              type="text"
              className={inputBase}
              placeholder="Nombre Apellido"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-600">
              Rol <span className="text-red-400">*</span>
            </label>
            <select
              required
              className={inputBase}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="operator">Operator</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Enviando...
                </>
              ) : (
                'Enviar invitación'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// UsuariosTab
// ---------------------------------------------------------------------------

function UsuariosTab() {
  const [users, setUsers]         = useState<IamUser[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [toastMsg, setToastMsg]   = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/iam/users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: IamUser[] = Array.isArray(json) ? json : (json.data ?? []);
      setUsers(list);
    } catch (err) {
      console.error('[UsuariosTab] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  function handleInviteSuccess() {
    setShowInvite(false);
    setToastMsg('Invitación enviada correctamente');
    setTimeout(() => setToastMsg(''), 3500);
    fetchUsers();
  }

  const ROLE_BADGE: Record<string, string> = {
    admin:    'bg-purple-100 text-purple-700',
    manager:  'bg-blue-100 text-blue-700',
    operator: 'bg-neutral-100 text-neutral-600',
  };

  return (
    <>
      <section className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-600">
                <circle cx="7" cy="6" r="3" />
                <path d="M1.5 15c0-3 2.5-5 5.5-5" />
                <path d="M13 11v4M11 13h4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Usuarios</h2>
              <p className="text-xs text-neutral-500">Gestiona los miembros del espacio de trabajo</p>
            </div>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>
            Invitar usuario
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-neutral-100 animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <svg viewBox="0 0 48 48" fill="none" className="mb-3 h-12 w-12 text-neutral-200">
              <circle cx="20" cy="16" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M4 40c0-8 7-14 16-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M34 28v10M29 33h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-sm font-semibold text-neutral-500">No hay usuarios</p>
            <p className="mt-1 text-xs text-neutral-400">Invita al primer miembro de tu equipo</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">Miembro desde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {users.map((u) => {
                  const displayName = u.fullName ?? u.name ?? u.email;
                  const initials = displayName
                    .split(' ')
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? '')
                    .join('');
                  const roleKey = (u.role ?? 'operator').toLowerCase();
                  const badgeClass = ROLE_BADGE[roleKey] ?? ROLE_BADGE.operator;

                  return (
                    <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-bold text-primary-700">
                            {initials || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-800">{displayName}</p>
                            <p className="text-[11px] text-neutral-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
                          {u.role ?? 'operator'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          u.status === 'active' || !u.status
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {u.status === 'active' || !u.status ? 'Activo' : u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AnimatePresence>
        {showInvite && (
          <InvitarUsuarioModal
            onClose={() => setShowInvite(false)}
            onSuccess={handleInviteSuccess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 shadow-xl"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
              <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth={2.2} className="h-3.5 w-3.5">
                <path d="M2 7l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-green-800">{toastMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'general',      label: 'General' },
  { key: 'usuarios',     label: 'Usuarios' },
  { key: 'integraciones', label: 'Integraciones' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function SettingsPage() {
  const { currency, setCurrency } = useCurrency();
  const { locale, timezone, setLocale, setTimezone } = useLocale();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" className="p-6 max-w-3xl">

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-neutral-100 bg-neutral-50 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <>
          {/* Section: Currency */}
          <section className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-600">
                  <circle cx="9" cy="9" r="7" />
                  <path d="M6.5 7.5c0-.8.7-1.5 2-1.5s2.5.8 2.5 1.8c0 1.2-1.5 1.2-1.5 2.2M9 13h.01" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Moneda</h2>
                <p className="text-xs text-neutral-500">Selecciona la moneda para mostrar valores monetarios en la plataforma</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CURRENCY_OPTIONS.map(opt => {
                const selected = currency === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setCurrency(opt.key)}
                    className={`relative rounded-xl border-2 p-5 text-left transition-all ${
                      selected
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    {/* Selected check */}
                    {selected && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5"><path d="M2 5l2.5 2.5L8 3"/></svg>
                      </div>
                    )}

                    {/* Flag + symbol */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg font-bold text-neutral-900">{opt.symbol}</span>
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">{opt.key}</span>
                    </div>

                    <p className={`text-sm font-semibold mb-1 ${selected ? 'text-primary-700' : 'text-neutral-800'}`}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-neutral-400 mb-3">{opt.desc}</p>

                    {/* Preview */}
                    <div className="rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2">
                      <p className="text-[10px] text-neutral-400 uppercase tracking-wider mb-0.5">Vista previa</p>
                      <p className="text-sm font-bold text-neutral-800">
                        {opt.example}
                        <span className="ml-0.5 text-[10px] font-normal text-neutral-400">{opt.key}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#2563eb" strokeWidth="1.3" className="shrink-0 mt-0.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 6.5v4M7 5h.01"/></svg>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                El cambio de moneda afecta solo la visualización. Los datos del módulo SII siempre se muestran en CLP (pesos chilenos) por normativa tributaria.
              </p>
            </div>
          </section>

          {/* Section: Display preferences */}
          <section className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-600">
                  <circle cx="9" cy="9" r="2.5" /><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Idioma y zona horaria</h2>
                <p className="text-xs text-neutral-500">Preferencias regionales de la plataforma</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">{t('settings.language')}</label>
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as AppLocale)}
                >
                  <option value="es">Español (Chile)</option>
                  <option value="en">English (US)</option>
                  <option value="pt">Português (BR)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">{t('settings.timezone')}</label>
                <select
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value as AppTimezone)}
                >
                  <option value="America/Santiago">America/Santiago (CLT, UTC-3)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST, UTC-5)</option>
                  <option value="Europe/Madrid">Europe/Madrid (CET, UTC+1)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section: Notifications */}
          <section className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-600">
                  <path d="M4.5 7a4.5 4.5 0 0 1 9 0c0 4.5 2 5.5 2 5.5H2.5s2-1 2-5.5" />
                  <path d="M7.5 14.5a2 2 0 0 0 3 0" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Notificaciones</h2>
                <p className="text-xs text-neutral-500">Configura las alertas que recibes</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Nuevos leads CRM', desc: 'Cuando se crea un contacto o empresa', default: true },
                { label: 'Deals cerrados', desc: 'Cuando un deal cambia a Cerrado Ganado/Perdido', default: true },
                { label: 'Campañas pausadas', desc: 'Cuando una campaña se pausa automáticamente', default: false },
                { label: 'Alertas SII', desc: 'Facturas rechazadas o con reparos', default: true },
              ].map(item => (
                <label key={item.label} className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{item.label}</p>
                    <p className="text-[11px] text-neutral-400">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={item.default}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-200"
                  />
                </label>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === 'usuarios' && <UsuariosTab />}

      {activeTab === 'integraciones' && <IntegracionesTab />}

    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// IntegracionesTab — Gmail connect/disconnect
// ---------------------------------------------------------------------------

function IntegracionesTab() {
  const [status, setStatus] = useState<{ connected: boolean; email?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/gmail/status', { cache: 'no-store' });
      if (!res.ok) { setStatus({ connected: false }); return; }
      setStatus(await res.json());
    } catch {
      setStatus({ connected: false });
    }
  }, []);

  useEffect(() => { void fetchStatus(); }, [fetchStatus]);

  async function handleConnect() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/gmail/oauth/url');
      if (!res.ok) throw new Error('No se pudo obtener la URL de autorización');
      const json = await res.json();
      if (!json.url) throw new Error('URL de autorización vacía');
      window.location.href = json.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/gmail/disconnect', { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('No se pudo desconectar');
      await fetchStatus();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white rounded-xl border border-neutral-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#EA4335">
            <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.7l-8 5-8-5V6l8 5 8-5v2.7z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-neutral-900">Gmail</h2>
          <p className="text-xs text-neutral-500">Conecta tu bandeja de Gmail para enviar y ver correos desde Suple</p>
        </div>
      </div>

      {status === null ? (
        <div className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
      ) : status.connected ? (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-semibold text-neutral-800">Conectado</p>
              <p className="text-xs text-neutral-500">{status.email}</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
          >
            {busy ? 'Desconectando...' : 'Desconectar'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-neutral-800">No conectado</p>
            <p className="text-xs text-neutral-500">Autoriza Suple a leer y enviar correos de tu cuenta de Gmail</p>
          </div>
          <button
            onClick={handleConnect}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {busy ? 'Redirigiendo...' : 'Conectar Gmail'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
    </section>
  );
}
