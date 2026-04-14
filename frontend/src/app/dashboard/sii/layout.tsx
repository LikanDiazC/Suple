'use client';

import React from 'react';
import TopBar from '../../../presentation/components/layout/TopBar';

export default function SiiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar title="SII / Facturación" subtitle="Consulta de facturas, IVA y declaraciones — Servicio de Impuestos Internos Chile" />
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
