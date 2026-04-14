'use client';

import React from 'react';
import TopBar from '../../../presentation/components/layout/TopBar';

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar title="CRM" subtitle="Smart CRM" />
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
