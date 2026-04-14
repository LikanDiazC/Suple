'use client';

import React from 'react';
import TopBar from '../../../presentation/components/layout/TopBar';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar title="Marketing" subtitle="Campañas, Ads & Atribución" />
      <div className="flex-1 overflow-auto bg-neutral-50 min-h-0">
        {children}
      </div>
    </div>
  );
}
