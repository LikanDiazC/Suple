'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { tokens } from '../../presentation/theme/tokens';
import { useAuth } from '@/application/context/auth/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const callbackUrl = params.get('callbackUrl') ?? '/dashboard';

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Credenciales inválidas');
      return;
    }
    if (result.mustChangePassword) {
      router.push('/change-password');
      return;
    }
    router.push(callbackUrl);
  }

  return (
    <div className="flex min-h-screen">
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12"
        style={{
          background: `linear-gradient(135deg, ${tokens.colors.primary[900]} 0%, ${tokens.colors.primary[700]} 100%)`,
        }}
      >
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Suple</h2>
          <p className="text-sm text-primary-200 mt-1">Plataforma Unificada de Negocios</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <p className="text-3xl font-bold text-white leading-tight">ERP. CRM. SCM. BPMS.</p>
          <p className="text-lg text-primary-200 mt-3 leading-relaxed">
            Una plataforma, cero silos. Visibilidad en tiempo real de todas las áreas del negocio.
          </p>
        </motion.div>
        <p className="text-xs text-primary-300">Zero-Trust Architecture &middot; Multi-Tenant Isolation</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">Inicia sesión</h1>
            <p className="text-sm text-neutral-500 mt-1">Accede al espacio de trabajo de tu empresa</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Correo corporativo
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition-all placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
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
              className="w-full rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-600 disabled:opacity-60"
            >
              {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Protected by TLS 1.3 &middot; Zero-Trust Architecture
          </p>
        </motion.div>
      </div>
    </div>
  );
}
