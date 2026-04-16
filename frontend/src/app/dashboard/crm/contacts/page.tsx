'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CrmTableView from '../../../../presentation/components/crm/CrmTableView';
import { CrmTableProvider } from '../../../../application/context/crm-table';
import type { ColumnDef, PropertyType } from '../../../../application/context/crm-table/types';
import { tokens } from '../../../../presentation/theme/tokens';

// ---------------------------------------------------------------------------
// Column definitions (with propertyType for QueryBuilder operator resolution)
// ---------------------------------------------------------------------------

const LEAD_STATUS_OPTIONS = [
  { value: 'new',             label: 'Nuevo' },
  { value: 'open',            label: 'Abierto' },
  { value: 'in_progress',     label: 'En progreso' },
  { value: 'qualified',       label: 'Calificado' },
  { value: 'unqualified',     label: 'No calificado' },
  { value: 'attempted',       label: 'Intento de contacto' },
  { value: 'connected',       label: 'Conectado' },
];

const CONTACT_COLUMNS: ColumnDef[] = [
  { key: 'first_name',          label: 'Nombre',               type: 'avatar', width: '220px', sortable: true,  visible: true,  propertyType: 'TEXT' },
  { key: 'email',               label: 'Correo electrónico',   type: 'email',  width: '220px', sortable: true,  visible: true,  propertyType: 'EMAIL' },
  { key: 'phone',               label: 'Teléfono',             type: 'text',   width: '140px', sortable: false, visible: true,  propertyType: 'PHONE' },
  { key: 'lead_status',         label: 'Estado del lead',      type: 'enum',   width: '140px', sortable: true,  visible: true,  propertyType: 'ENUM', options: LEAD_STATUS_OPTIONS.map((o, i) => ({ ...o, displayOrder: i })) },
  { key: 'content_topics',      label: 'Temas de contenido',   type: 'text',   width: '160px', sortable: false, visible: false, propertyType: 'TEXT' },
  { key: 'preferred_channels',  label: 'Canales preferidos',   type: 'text',   width: '160px', sortable: false, visible: false, propertyType: 'TEXT' },
  { key: 'create_date',         label: 'Fecha de creación',    type: 'date',   width: '180px', sortable: true,  visible: true,  propertyType: 'DATETIME' },
  { key: 'last_activity',       label: 'Última actividad',     type: 'date',   width: '180px', sortable: true,  visible: true,  propertyType: 'DATETIME' },
];

// ---------------------------------------------------------------------------
// All filterable properties (drives QueryBuilder dropdowns)
// ---------------------------------------------------------------------------

const CONTACT_PROPERTIES = [
  { key: 'first_name',         label: 'Nombre',              type: 'TEXT'     as PropertyType, group: 'Información general' },
  { key: 'last_name',          label: 'Apellido',            type: 'TEXT'     as PropertyType, group: 'Información general' },
  { key: 'email',              label: 'Correo electrónico',  type: 'EMAIL'    as PropertyType, group: 'Información general' },
  { key: 'phone',              label: 'Teléfono',            type: 'PHONE'    as PropertyType, group: 'Información general' },
  { key: 'company',            label: 'Empresa',             type: 'TEXT'     as PropertyType, group: 'Información general' },
  { key: 'lead_status',        label: 'Estado del lead',     type: 'ENUM'     as PropertyType, group: 'Información general', options: LEAD_STATUS_OPTIONS },
  { key: 'content_topics',     label: 'Temas de contenido',  type: 'TEXT'     as PropertyType, group: 'Conversión' },
  { key: 'preferred_channels', label: 'Canales preferidos',  type: 'TEXT'     as PropertyType, group: 'Conversión' },
  { key: 'create_date',        label: 'Fecha de creación',   type: 'DATETIME' as PropertyType, group: 'Sistema' },
  { key: 'last_activity',      label: 'Última actividad',    type: 'DATETIME' as PropertyType, group: 'Actividad' },
  { key: 'owner_id',           label: 'Propietario',         type: 'TEXT'     as PropertyType, group: 'Sistema' },
];

const TABS = [
  { label: 'Todos los contactos', count: 14, active: true },
  { label: 'Mis contactos',       active: false },
  { label: 'No contactados',      active: false },
];

interface DuplicateWarning {
  matchedName: string;
  confidence: number;
  field: string;
}

export default function ContactsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', company: '' });
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([]);

  const KNOWN_EMAILS = [
    { email: 'admision@udla.cl',           name: 'UDLA' },
    { email: 'contacto@appcopec.com',      name: 'App Copec' },
    { email: 'webseminars@aveva.com',      name: 'Tom Turpel from AVEVA' },
    { email: 'admisionduocuc@duoc.cl',     name: 'Admision Duoc UC' },
    { email: 'webadm@sii.cl',             name: 'Clave Tributaria SII' },
    { email: 'communication@fracttal.com', name: 'Christian Struve - Fracttal' },
    { email: 'workspace@google.com',       name: 'The Google Workspace' },
    { email: 'contact@napkin.ai',          name: 'Napkin AI' },
  ];

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const warnings: DuplicateWarning[] = [];

    if (field === 'email' && value.length > 4) {
      const v = value.toLowerCase().trim();
      for (const known of KNOWN_EMAILS) {
        const sim = jaroWinkler(v, known.email);
        if (sim > 0.80 && sim < 1) {
          warnings.push({ matchedName: known.name, confidence: sim, field: 'email' });
        }
      }
    }

    if (field === 'firstName' || field === 'lastName') {
      const fullName = `${field === 'firstName' ? value : formData.firstName} ${field === 'lastName' ? value : formData.lastName}`.trim().toLowerCase();
      if (fullName.length > 3) {
        for (const known of KNOWN_EMAILS) {
          const sim = jaroWinkler(fullName, known.name.toLowerCase());
          if (sim > 0.75) {
            warnings.push({ matchedName: known.name, confidence: sim, field: 'nombre' });
          }
        }
      }
    }

    setDuplicates(warnings);
  };

  const handleSave = () => {
    setShowForm(false);
    setFormData({ firstName: '', lastName: '', email: '', phone: '', company: '' });
    setDuplicates([]);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* New Contact Form (overlay panel at top) */}
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
                <h3 className="text-sm font-semibold text-neutral-800">Crear contacto</h3>
                <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                <input
                  placeholder="Nombre"
                  value={formData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <input
                  placeholder="Apellido"
                  value={formData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <input
                  placeholder="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <input
                  placeholder="Telefono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
                <input
                  placeholder="Empresa"
                  value={formData.company}
                  onChange={(e) => handleFieldChange('company', e.target.value)}
                  className="rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                />
              </div>

              {/* Duplicate Detection Alert */}
              <AnimatePresence>
                {duplicates.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-4 rounded-lg border p-3"
                    style={{ borderColor: tokens.colors.warning.base + '40', backgroundColor: tokens.colors.warning.light }}
                  >
                    <div className="flex items-start gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5" stroke={tokens.colors.warning.dark} strokeWidth="1.5">
                        <path d="M8 1.5l6.5 12H1.5L8 1.5z"/><path d="M8 6.5v3M8 11.5v0"/>
                      </svg>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: tokens.colors.warning.dark }}>
                          Posible duplicado detectado
                        </p>
                        {duplicates.map((d, i) => (
                          <p key={i} className="text-xs mt-0.5" style={{ color: tokens.colors.warning.dark }}>
                            Similar a &ldquo;{d.matchedName}&rdquo; ({(d.confidence * 100).toFixed(0)}% via {d.field})
                          </p>
                        ))}
                        <p className="text-[10px] mt-1.5 opacity-60" style={{ color: tokens.colors.warning.dark }}>
                          Entity Resolution: Jaro-Winkler similarity
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="rounded-md bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
                >
                  Guardar contacto
                </button>
                <button
                  onClick={() => { setShowForm(false); setDuplicates([]); }}
                  className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HubSpot-style Table View — wrapped in CrmTableProvider */}
      <CrmTableProvider
        objectType="contacts"
        initialColumns={CONTACT_COLUMNS}
        properties={CONTACT_PROPERTIES}
      >
        <CrmTableView
          title="Contactos"
          tabs={TABS}
          onAddRecord={() => setShowForm(true)}
        />
      </CrmTableProvider>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jaro-Winkler for frontend dedup preview
// ---------------------------------------------------------------------------
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length, len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0, transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}
