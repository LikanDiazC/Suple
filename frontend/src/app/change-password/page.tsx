'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { tokens } from '../../presentation/theme/tokens';
import { useAuth } from '@/application/context/auth/AuthContext';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (next !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setSubmitting(true);
    const result = await changePassword(current, next);
    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? 'Error al cambiar contraseña'); return; }
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">
          <div className="mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
              style={{ background: `${tokens.colors.primary[50]}` }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke={tokens.colors.primary[600]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="10" width="16" height="11" rx="2"/>
                <path d="M7 10V6a4 4 0 0 1 8 0v4"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Cambia tu contraseña</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Tu cuenta requiere que establezcas una nueva contraseña antes de continuar.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Contraseña actual
              </label>
              <input
                type="password"
                required
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="Tu contraseña temporal"
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition-all placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition-all placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition-all placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60"
              style={{ background: tokens.colors.primary[500] }}
            >
              {submitting ? 'Guardando…' : 'Establecer nueva contraseña'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
