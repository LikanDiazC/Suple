'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { tokens } from '../../presentation/theme/tokens';

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleDemoMode = () => {
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('demo_user', JSON.stringify({ name: 'Demo User', email: 'demo@enterprise.com' }));
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12"
        style={{ background: `linear-gradient(135deg, ${tokens.colors.primary[900]} 0%, ${tokens.colors.primary[700]} 100%)` }}
      >
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Enterprise</h2>
          <p className="text-sm text-primary-200 mt-1">Unified Business Platform</p>
        </div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <p className="text-3xl font-bold text-white leading-tight">
              ERP. CRM. SCM. BPMS.
            </p>
            <p className="text-lg text-primary-200 mt-3 leading-relaxed">
              One platform, zero silos. Real-time visibility across every business function.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { value: '99.9%', label: 'Uptime SLA' },
              { value: 'AES-256', label: 'Encryption' },
              { value: '<60s', label: 'Zero-Touch Onboarding' },
              { value: 'SOC 2', label: 'Compliance' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="rounded-xl bg-white/10 p-4 backdrop-blur-sm"
              >
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-primary-200 mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-300">Zero-Trust Architecture &middot; Multi-Tenant Isolation</p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-900">Sign in</h1>
            <p className="text-sm text-neutral-500 mt-1">Access your enterprise workspace</p>
          </div>

          {/* SSO Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:shadow-md"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
            <button
              disabled
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-400 shadow-sm opacity-50 cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <circle cx="9" cy="9" r="8" fill="#007DC1"/>
                <circle cx="9" cy="9" r="3.5" fill="white"/>
              </svg>
              Okta SSO (Proximamente)
            </button>
            <button
              disabled
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-400 shadow-sm opacity-50 cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="14" height="10" rx="2"/><path d="M6 8h6M6 11h4"/>
              </svg>
              SAML (Proximamente)
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-neutral-400">o inicia sesion con email</span>
            </div>
          </div>

          {/* Email Form - Disabled / Coming Soon */}
          <fieldset disabled className="space-y-4 opacity-50">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Work email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 outline-none transition-all placeholder:text-neutral-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 outline-none transition-all placeholder:text-neutral-400 cursor-not-allowed"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-sm cursor-not-allowed"
            >
              Sign in (Proximamente)
            </button>
          </fieldset>

          {/* Demo mode */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-4 text-neutral-400">o prueba sin cuenta</span>
            </div>
          </div>
          <button
            onClick={handleDemoMode}
            className="w-full rounded-xl border-2 border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-500 transition-all hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50"
          >
            Entrar en modo demo
          </button>

          <p className="mt-6 text-center text-xs text-neutral-400">
            Protected by TLS 1.3 &middot; Zero-Trust Architecture
          </p>
        </motion.div>
      </div>
    </div>
  );
}
