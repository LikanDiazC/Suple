'use client';

import React from 'react';
import Sidebar from '../../presentation/components/layout/Sidebar';
import { EmailProvider } from '../../application/context/email/EmailContext';
import { CurrencyProvider } from '../../application/context/currency/CurrencyContext';
import { MobileMenuProvider, useMobileMenu } from '../../application/context/mobile-menu/MobileMenuContext';
import ComposeEmailModal from '../../presentation/components/email/ComposeEmailModal';

function MobileBackdrop() {
  const { isOpen, close } = useMobileMenu();
  if (!isOpen) return null;
  return (
    <div
      onClick={close}
      className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
      aria-hidden="true"
    />
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <EmailProvider>
        <MobileMenuProvider>
          <div className="flex min-h-screen bg-neutral-50">
            <Sidebar />
            <MobileBackdrop />
            <main className="flex-1 min-w-0 transition-[margin] duration-300 lg:ml-[280px]">
              {children}
            </main>
          </div>
          <ComposeEmailModal />
        </MobileMenuProvider>
      </EmailProvider>
    </CurrencyProvider>
  );
}
