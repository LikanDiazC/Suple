'use client';

import React from 'react';
import Sidebar from '../../presentation/components/layout/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      {/* Main content area offset by sidebar width */}
      <main className="ml-[280px] flex-1 transition-[margin] duration-300">
        {children}
      </main>
    </div>
  );
}
