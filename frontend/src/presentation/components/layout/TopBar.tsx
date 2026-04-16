'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tooltipVariants } from '../../animations/variants';
import { useAuth } from '../../../application/context/auth/AuthContext';
import { useMobileMenu } from '../../../application/context/mobile-menu/MobileMenuContext';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
  const [showProfile, setShowProfile] = useState(false);
  const { user, signOut } = useAuth();
  const { open: openMobileMenu } = useMobileMenu();

  const displayName = user?.name || 'Admin User';
  const displayEmail = user?.email || 'admin@suple.cl';
  const nameParts = displayName.split(' ').filter(Boolean);
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : displayName.slice(0, 2).toUpperCase();
  const userImage = user?.image || null;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger (hidden at lg+) */}
        <button
          onClick={openMobileMenu}
          className="lg:hidden rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition-colors"
          aria-label="Abrir menú"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-neutral-900 tracking-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-neutral-400">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Buscar módulos, contactos, entradas..."
            className="h-9 w-72 rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-4 text-sm text-neutral-700 placeholder-neutral-400 outline-none transition-all focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="6" cy="6" r="4.5" /><path d="M10 10l3 3" />
          </svg>
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors" aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 7a4.5 4.5 0 0 1 9 0c0 4.5 2 5.5 2 5.5H2.5s2-1 2-5.5" />
            <path d="M7.5 14.5a2 2 0 0 0 3 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-500" aria-hidden="true" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-100 transition-colors"
            aria-expanded={showProfile}
            aria-label="User menu"
          >
            {userImage ? (
              <img src={userImage} alt={displayName} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
            )}
            <div className="hidden text-left lg:block">
              <p className="text-sm font-medium text-neutral-800">{displayName}</p>
              <p className="text-[10px] text-neutral-400">{displayEmail}</p>
            </div>
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                variants={tooltipVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl"
              >
                <div className="border-b border-neutral-100 px-3 py-2 mb-1">
                  <p className="text-sm font-semibold text-neutral-800">{displayName}</p>
                  <p className="text-xs text-neutral-400">{displayEmail}</p>
                </div>
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50">
                  <span>Preferencias de cuenta</span>
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  <span>Cerrar sesión</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
