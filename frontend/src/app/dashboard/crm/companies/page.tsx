'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CrmTableView from '../../../../presentation/components/crm/CrmTableView';
import { CrmTableProvider } from '../../../../application/context/crm-table';
import { useCrmTable } from '../../../../application/context/crm-table/CrmTableContext';
import type { ColumnDef, PropertyType } from '../../../../application/context/crm-table/types';

// ---------------------------------------------------------------------------
// Column definitions (with propertyType for QueryBuilder operator resolution)
// ---------------------------------------------------------------------------

const COMPANY_LEAD_STATUS_OPTIONS = [
  { value: 'new',             label: 'Nuevo' },
  { value: 'open',            label: 'Abierto' },
  { value: 'in_progress',     label: 'En progreso' },
  { value: 'qualified',       label: 'Calificado' },
  { value: 'unqualified',     label: 'No calificado' },
];

const COMPANY_COLUMNS: ColumnDef[] = [
  { key: 'name',           label: 'Nombre',               type: 'avatar',   width: '220px', sortable: true,  visible: true,  propertyType: 'TEXT' },
  { key: 'domain',         label: 'Dominio',              type: 'text',     width: '180px', sortable: true,  visible: true,  propertyType: 'URL' },
  { key: 'owner_id',       label: 'Propietario',          type: 'text',     width: '160px', sortable: true,  visible: true,  propertyType: 'TEXT' },
  { key: 'phone',          label: 'Teléfono',             type: 'text',     width: '140px', sortable: false, visible: true,  propertyType: 'PHONE' },
  { key: 'city',           label: 'Ciudad',               type: 'text',     width: '120px', sortable: true,  visible: true,  propertyType: 'TEXT' },
  { key: 'lead_status',    label: 'Estado del lead',      type: 'enum',     width: '140px', sortable: true,  visible: false, propertyType: 'ENUM', options: COMPANY_LEAD_STATUS_OPTIONS.map((o, i) => ({ ...o, displayOrder: i })) },
  { key: 'create_date',    label: 'Fecha de creación',    type: 'date',     width: '180px', sortable: true,  visible: true,  propertyType: 'DATETIME' },
  { key: 'last_activity',  label: 'Última actividad',     type: 'date',     width: '180px', sortable: true,  visible: true,  propertyType: 'DATETIME' },
];

// ---------------------------------------------------------------------------
// All filterable properties (drives QueryBuilder dropdowns)
// ---------------------------------------------------------------------------

const COMPANY_PROPERTIES = [
  { key: 'name',            label: 'Nombre',             type: 'TEXT'     as PropertyType, group: 'Información general' },
  { key: 'domain',          label: 'Dominio',            type: 'URL'      as PropertyType, group: 'Información general' },
  { key: 'phone',           label: 'Teléfono',           type: 'PHONE'    as PropertyType, group: 'Información general' },
  { key: 'city',            label: 'Ciudad',             type: 'TEXT'     as PropertyType, group: 'Información general' },
  { key: 'industry',        label: 'Industria',          type: 'TEXT'     as PropertyType, group: 'Información general' },
  { key: 'employee_count',  label: 'N° empleados',       type: 'NUMBER'   as PropertyType, group: 'Información general' },
  { key: 'annual_revenue',  label: 'Ingresos anuales',   type: 'CURRENCY' as PropertyType, group: 'Información general' },
  { key: 'lead_status',     label: 'Estado del lead',    type: 'ENUM'     as PropertyType, group: 'Información general', options: COMPANY_LEAD_STATUS_OPTIONS },
  { key: 'owner_id',        label: 'Propietario',        type: 'TEXT'     as PropertyType, group: 'Sistema' },
  { key: 'create_date',     label: 'Fecha de creación',  type: 'DATETIME' as PropertyType, group: 'Sistema' },
  { key: 'last_activity',   label: 'Última actividad',   type: 'DATETIME' as PropertyType, group: 'Actividad' },
];

const TABS = [
  { label: 'Todas las empresas', count: 11, active: true },
  { label: 'Mis empresas',       active: false },
];

function GmailAutoSync() {
  const { refreshData } = useCrmTable();
  React.useEffect(() => {
    fetch('/api/gmail/sync-contacts', { method: 'POST' })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { companiesCreated: number } | null) => {
        if (data && data.companiesCreated > 0) refreshData();
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function CompaniesPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', domain: '', phone: '', city: '' });

  const handleSave = () => {
    setShowForm(false);
    setFormData({ name: '', domain: '', phone: '', city: '' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* New Company Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-neutral-200 bg-white"
          >
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-neutral-800">Crear empresa</h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <input
                  placeholder="Nombre de la empresa"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <input
                  placeholder="Dominio (ej: empresa.com)"
                  value={formData.domain}
                  onChange={(e) => setFormData((p) => ({ ...p, domain: e.target.value }))}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <input
                  placeholder="Telefono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <input
                  placeholder="Ciudad"
                  value={formData.city}
                  onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  Guardar empresa
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CrmTableProvider
        objectType="companies"
        initialColumns={COMPANY_COLUMNS}
        properties={COMPANY_PROPERTIES}
      >
        <GmailAutoSync />
        <CrmTableView
          title="Empresas"
          tabs={TABS}
          onAddRecord={() => setShowForm(true)}
        />
      </CrmTableProvider>
    </div>
  );
}
