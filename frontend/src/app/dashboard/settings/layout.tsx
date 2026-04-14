'use client';

import React from 'react';
import TopBar from '../../../presentation/components/layout/TopBar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar title="Configuración" subtitle="Preferencias generales de la plataforma" />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
