'use client';

import React from 'react';
import Sidebar from '../../presentation/components/layout/Sidebar';
import { EmailProvider } from '../../application/context/email/EmailContext';
import { CurrencyProvider } from '../../application/context/currency/CurrencyContext';
import ComposeEmailModal from '../../presentation/components/email/ComposeEmailModal';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <EmailProvider>
        <div className="flex min-h-screen bg-neutral-50">
          <Sidebar />
          <main className="ml-[280px] flex-1 transition-[margin] duration-300">
            {children}
          </main>
        </div>
        <ComposeEmailModal />
      </EmailProvider>
    </CurrencyProvider>
  );
}
