'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmailCompose } from '../../../../application/context/email/EmailContext';
import type { GmailMessage } from '../../../../application/context/email/EmailContext';
import { useCurrentUser } from '../../../../application/hooks/useCurrentUser';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailSender {
  name: string;
  email: string;
}

interface MockEmail {
  id: string;
  from: EmailSender;
  subject: string;
  preview: string;
  body: string;
  date: Date;
  read: boolean;
  starred: boolean;
  folder: 'inbox' | 'sent' | 'drafts' | 'starred';
  companyDomain: string;
  companyName: string;
}

// ---------------------------------------------------------------------------
// Mock email data (sourced from CRM company domains)
// ---------------------------------------------------------------------------

const now = new Date();
const ago = (h: number, m = 0) => new Date(now.getTime() - (h * 60 + m) * 60_000);

const MOCK_EMAILS: MockEmail[] = [
  {
    id: 'em1',
    from: { name: 'María Torres', email: 'maria.torres@udla.cl' },
    subject: 'Reunión de seguimiento — Integración CRM',
    preview: 'Quería confirmar nuestra reunión del lunes a las 10 AM para revisar el avance...',
    body: `Estimado/a,\n\nEspero que te encuentres bien.\n\nMe pongo en contacto para confirmar nuestra reunión del próximo lunes a las 10:00 AM donde revisaremos el avance de la integración de la plataforma CRM con nuestros sistemas de gestión académica.\n\nTenemos pendiente revisar:\n• Sincronización de base de datos de estudiantes\n• Módulo de seguimiento de matrículas\n• Reportería de conversión\n\nPor favor confirma tu disponibilidad.\n\nSaludos cordiales,\nMaría Torres\nDirectora de Tecnología\nUniversity of Las Americas`,
    date: ago(1, 30),
    read: false,
    starred: true,
    folder: 'inbox',
    companyDomain: 'udla.cl',
    companyName: 'University of Las Americas',
  },
  {
    id: 'em2',
    from: { name: 'Google Workspace', email: 'workspace@google.com' },
    subject: 'Renovación de licencias — Google Workspace Business',
    preview: 'Tu suscripción de Google Workspace vence el 30 de abril. Renueva ahora para...',
    body: `Hola,\n\nTu suscripción de Google Workspace Business Plus vence el 30 de abril de 2026.\n\nDetalles de renovación:\n• Plan: Business Plus\n• Usuarios: 25 licencias\n• Costo mensual: $300 USD\n• Fecha límite: 30 de abril, 2026\n\nRenova antes del vencimiento para evitar interrupciones en el servicio.\n\nEl equipo de Google Workspace`,
    date: ago(3),
    read: false,
    starred: false,
    folder: 'inbox',
    companyDomain: 'google.com',
    companyName: 'Google',
  },
  {
    id: 'em3',
    from: { name: 'James Smith', email: 'j.smith@aveva.com' },
    subject: 'Propuesta de proyecto — Integración SCADA & CRM',
    preview: 'Adjunto encontrarás nuestra propuesta para integrar el sistema SCADA con tu plataforma CRM...',
    body: `Estimado/a,\n\nEspero que estés teniendo una excelente semana.\n\nTal como conversamos en nuestra última llamada, te hacemos llegar nuestra propuesta para integrar el sistema SCADA con tu plataforma CRM.\n\nEsta integración permitiría:\n1. Visibilidad en tiempo real del estado de equipos por cliente\n2. Alertas automáticas de mantenimiento vinculadas al CRM\n3. Historial de incidencias integrado en el perfil del cliente\n\nEstimamos un plazo de implementación de 3 meses.\n\nQuedo atento a tus comentarios.\n\nJames Smith\nSales Engineer\nAVEVA Group plc`,
    date: ago(20),
    read: false,
    starred: false,
    folder: 'inbox',
    companyDomain: 'aveva.com',
    companyName: 'AVEVA Group plc',
  },
  {
    id: 'em4',
    from: { name: 'Equipo Fracttal', email: 'contacto@fracttal.com' },
    subject: 'Nuevo módulo predictivo disponible en Fracttal One',
    preview: 'Te informamos que ya está disponible el nuevo módulo de mantenimiento predictivo...',
    body: `Hola,\n\nNos complace informarte que ya está disponible el nuevo módulo de mantenimiento predictivo en Fracttal One.\n\nCaracterísticas principales:\n• Algoritmos de ML para predicción de fallas\n• Integración nativa con sensores IoT\n• Dashboards de KPIs de mantenimiento\n• Compatible con tu plan actual\n\nPuedes activarlo desde la configuración de tu cuenta sin costo adicional.\n\nEl equipo de Fracttal`,
    date: ago(28),
    read: true,
    starred: false,
    folder: 'inbox',
    companyDomain: 'fracttal.com',
    companyName: 'Fracttal',
  },
  {
    id: 'em5',
    from: { name: 'Duoc UC', email: 'capacitacion@duoc.cl' },
    subject: 'Programa de capacitación corporativa Q2 2026',
    preview: 'Te presentamos nuestra oferta de capacitación para el segundo trimestre...',
    body: `Estimado/a,\n\nTe presentamos nuestra oferta de capacitación corporativa para el segundo trimestre de 2026.\n\nProgramas disponibles:\n• Transformación Digital para Equipos Comerciales (20 hrs)\n• Análisis de Datos con Power BI (16 hrs)\n• Liderazgo y Gestión de Equipos (12 hrs)\n• Excel Avanzado para Finanzas (8 hrs)\n\nTodos los programas incluyen certificado y pueden realizarse en modalidad online o presencial.\n\nContacta a nuestro equipo para cotizar.\n\nDuoc UC — Capacitación Corporativa`,
    date: ago(48),
    read: true,
    starred: false,
    folder: 'inbox',
    companyDomain: 'duoc.cl',
    companyName: 'Duoc UC',
  },
  {
    id: 'em6',
    from: { name: 'SII Chile', email: 'notificaciones@sii.cl' },
    subject: 'Recordatorio: Declaración de IVA — Abril 2026',
    preview: 'Le recordamos que el plazo para presentar la declaración mensual de IVA vence el 12...',
    body: `Estimado/a contribuyente,\n\nLe recordamos que el plazo para presentar la declaración mensual de IVA correspondiente a marzo 2026 vence el 12 de abril de 2026.\n\nPuede realizar su declaración en el portal del SII: www.sii.cl\n\nSi ya realizó su declaración, ignore este mensaje.\n\nServicio de Impuestos Internos`,
    date: ago(72),
    read: true,
    starred: false,
    folder: 'inbox',
    companyDomain: 'sii.cl',
    companyName: 'Servicio de Impuestos Internos',
  },
  {
    id: 'em7',
    from: { name: 'Víctor Herrera', email: 'vherrera@bancoestado.cl' },
    subject: 'Propuesta de financiamiento — Línea de capital de trabajo',
    preview: 'En BancoEstado queremos ofrecerte una línea de crédito especial para capital de trabajo...',
    body: `Estimado/a cliente,\n\nEn BancoEstado queremos ofrecerte una línea de crédito especial para capital de trabajo con condiciones preferenciales.\n\nCaracterísticas:\n• Monto: hasta $500 millones CLP\n• Tasa: 0.48% mensual\n• Plazo: hasta 36 meses\n• Sin garantías reales para montos menores a $100 MM\n\nEsta oferta está disponible hasta el 30 de abril.\n\nContáctame para agendar una reunión.\n\nVíctor Herrera\nGerente de Empresas\nBancoEstado`,
    date: ago(96),
    read: true,
    starred: true,
    folder: 'inbox',
    companyDomain: 'bancoestado.cl',
    companyName: 'BancoEstado',
  },
  {
    id: 'em8',
    from: { name: 'Napkin AI', email: 'demo@napkin.ai' },
    subject: 'Tu prueba gratuita de Napkin AI está lista',
    preview: 'Convierte texto en diagramas y visualizaciones con inteligencia artificial...',
    body: `Hola,\n\nTu cuenta de prueba gratuita de Napkin AI ha sido activada.\n\n¿Qué puedes hacer con Napkin?\n• Convertir texto e ideas en diagramas automáticamente\n• Generar flowcharts, mind maps y visualizaciones con IA\n• Exportar en PNG, SVG o PDF\n• Integrar con Notion, Slack y más\n\nEmpieza ahora en app.napkin.ai con tu cuenta de prueba de 14 días.\n\nEl equipo de Napkin AI`,
    date: ago(5),
    read: false,
    starred: false,
    folder: 'inbox',
    companyDomain: 'napkin.ai',
    companyName: 'Napkin AI',
  },
  {
    id: 'em9',
    from: { name: 'Carlos Mendoza', email: 'cmendoza@pasesparques.cl' },
    subject: 'Sistema de control de acceso RFID — Avance del proyecto',
    preview: 'Te enviamos el informe de avance de la implementación del sistema de control...',
    body: `Estimado/a,\n\nTe enviamos el informe mensual de avance de la implementación del sistema de control de acceso RFID.\n\nResumen de avance:\n• Instalación de lectores: 85% completado\n• Configuración de software: 100%\n• Integración con torniquetes: 70%\n• Capacitación al personal: pendiente\n\nFecha estimada de entrega: 25 de abril de 2026.\n\nSaludos,\nCarlos Mendoza\nJefe de Proyectos\nPases Digitales Parques`,
    date: ago(120),
    read: true,
    starred: false,
    folder: 'inbox',
    companyDomain: 'pasesparques.cl',
    companyName: 'Pases Digitales Parques',
  },
  {
    id: 'em10',
    from: { name: 'ICI Ingeniería', email: 'proyectos@ici-ingenieria.cl' },
    subject: 'Cotización — Automatización de línea de producción',
    preview: 'Adjunto encontrarás la cotización detallada para el proyecto de automatización...',
    body: `Estimado/a,\n\nAdjunto encontrarás la cotización detallada para el proyecto de automatización de la línea de producción N°3.\n\nResumen de la propuesta:\n• Alcance: Automatización completa de línea de envasado\n• Tecnología: PLCs Siemens S7-1500 + HMI\n• Plazo de ejecución: 4 meses\n• Precio neto: $45.800.000 CLP\n• Garantía: 12 meses\n\nQuedamos a disposición para resolver cualquier consulta.\n\nICI Ingeniería — Proyectos Industriales`,
    date: ago(144),
    read: true,
    starred: false,
    folder: 'inbox',
    companyDomain: 'ici-ingenieria.cl',
    companyName: 'ICI Ingeniería',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEmailDate(date: Date): string {
  const now = new Date();
  const diffH = (now.getTime() - date.getTime()) / 3_600_000;
  if (diffH < 24) {
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffH < 48) return 'Ayer';
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function getAvatarGradient(email: string): string {
  const colors = [
    'from-blue-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600',
    'from-orange-400 to-orange-600',
    'from-rose-400 to-rose-600',
    'from-cyan-400 to-cyan-600',
    'from-amber-400 to-amber-600',
    'from-indigo-400 to-indigo-600',
  ];
  const hash = (email ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  return parts.length >= 2
    ? ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase()
    : name.slice(0, 2).toUpperCase() || '?';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Folder = 'inbox' | 'sent' | 'drafts' | 'starred';

interface FolderItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
}

function FolderItem({ icon, label, badge, active, onClick }: FolderItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      <span className={active ? 'text-primary-500' : 'text-neutral-400'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-primary-100 text-primary-700' : 'bg-neutral-200 text-neutral-600'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

interface EmailRowProps {
  email: MockEmail;
  selected: boolean;
  onClick: () => void;
}

function EmailRow({ email, selected, onClick }: EmailRowProps) {
  const initials = getInitials(email.from.name);
  const gradient = getAvatarGradient(email.from.email);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-neutral-100 transition-colors ${
        selected ? 'bg-primary-50 border-l-2 border-l-primary-500' : 'hover:bg-neutral-50'
      } ${!email.read && !selected ? 'bg-white' : ''}`}
    >
      {/* Unread dot */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-0.5">
        <div className={`h-2 w-2 rounded-full ${email.read ? 'bg-transparent' : 'bg-primary-500'}`} />
      </div>

      {/* Avatar */}
      <div className={`h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="text-[11px] font-bold text-white">{initials}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${email.read ? 'text-neutral-700' : 'text-neutral-900 font-semibold'}`}>
            {email.from.name}
          </span>
          <span className="text-[11px] text-neutral-400 flex-shrink-0" suppressHydrationWarning>{formatEmailDate(email.date)}</span>
        </div>
        <p className={`text-[13px] truncate mt-0.5 ${email.read ? 'text-neutral-500' : 'text-neutral-800 font-medium'}`}>
          {email.subject}
        </p>
        <p className="text-xs text-neutral-400 truncate mt-0.5">{email.preview}</p>
      </div>

      {/* Star */}
      {email.starred && (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="#F59E0B" stroke="#F59E0B" strokeWidth="0.5" className="flex-shrink-0 mt-1">
          <path d="M6.5 1l1.4 3.9H12l-3.3 2.4 1.3 3.9L6.5 9 3.1 11.2l1.3-3.9L1 4.9h4.1z"/>
        </svg>
      )}
    </button>
  );
}

interface EmailDetailProps {
  email: MockEmail;
  onReply: () => void;
}

function EmailDetail({ email, onReply }: EmailDetailProps) {
  const initials  = getInitials(email.from.name);
  const gradient  = getAvatarGradient(email.from.email);

  return (
    <motion.div
      key={email.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Subject + meta */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-neutral-100">
        <h2 className="text-xl font-bold text-neutral-900 mb-4">{email.subject}</h2>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
              <span className="text-[13px] font-bold text-white">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">{email.from.name}</p>
              <p className="text-xs text-neutral-500">{email.from.email}</p>
            </div>
          </div>
          <span className="text-xs text-neutral-400 flex-shrink-0" suppressHydrationWarning>
            {email.date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* CRM badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="4.5" cy="3.5" r="2"/><path d="M1 9c0-1.9 1.6-3.5 3.5-3.5S8 7.1 8 9"/>
            </svg>
            CRM: {email.companyName}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="text-sm text-neutral-800 leading-relaxed whitespace-pre-line max-w-2xl">
          {email.body}
        </div>
      </div>

      {/* Reply bar */}
      <div className="flex-shrink-0 border-t border-neutral-100 px-8 py-4 bg-neutral-50">
        <button
          onClick={onReply}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 4L1 7.5l4 3.5M1 7.5h9a4 4 0 0 1 4 4v0"/>
          </svg>
          Responder
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InboxPage() {
  const { openCompose, inbox: realInbox, isLoadingInbox } = useEmailCompose();
  const user = useCurrentUser();

  const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
  const [selectedId, setSelectedId]     = useState<string | null>('em1');
  const [search, setSearch]             = useState('');
  const [emails, setEmails]             = useState<MockEmail[]>(MOCK_EMAILS);
  const [usingRealData, setUsingRealData] = useState(false);

  // When real Gmail data is available, convert and use it
  useEffect(() => {
    if (!isLoadingInbox && realInbox.length > 0) {
      const safeDate = (raw: string): Date => {
        if (!raw) return new Date();
        const d = new Date(raw);
        return isNaN(d.getTime()) ? new Date() : d;
      };

      const converted: MockEmail[] = realInbox
        .filter((msg: GmailMessage) => msg.id) // skip messages with null id
        .map((msg: GmailMessage, idx: number) => ({
          id: msg.id || `real-${idx}`,
          from: { name: msg.from || msg.fromEmail || 'Desconocido', email: msg.fromEmail || '' },
          subject: msg.subject || '(Sin asunto)',
          preview: msg.snippet || '',
          body: msg.snippet || '',
          date: safeDate(msg.date),
          read: !msg.isUnread,
          starred: msg.isStarred,
          folder: 'inbox' as const,
          companyDomain: msg.fromEmail?.split('@')[1] || '',
          companyName: msg.fromEmail?.split('@')[1]?.split('.')[0] || '',
        }));
      setEmails(converted);
      setUsingRealData(true);
      if (converted.length > 0) setSelectedId(converted[0].id);
    }
  }, [isLoadingInbox, realInbox]);

  const filtered = useMemo(() => {
    let list = emails.filter((e) => {
      if (activeFolder === 'starred') return e.starred;
      if (activeFolder === 'sent')    return e.folder === 'sent';
      if (activeFolder === 'drafts')  return e.folder === 'drafts';
      return e.folder === 'inbox';
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.subject.toLowerCase().includes(q) || e.from.name.toLowerCase().includes(q) || e.preview.toLowerCase().includes(q),
      );
    }
    return list;
  }, [emails, activeFolder, search]);

  const selectedEmail = emails.find((e) => e.id === selectedId) ?? null;
  const unreadCount   = emails.filter((e) => e.folder === 'inbox' && !e.read).length;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setEmails((prev) => prev.map((e) => e.id === id ? { ...e, read: true } : e));
  };

  const handleReply = () => {
    if (!selectedEmail) return;
    openCompose({
      to: selectedEmail.from.email,
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\n--- Correo original ---\nDe: ${selectedEmail.from.name} <${selectedEmail.from.email}>\nFecha: ${selectedEmail.date.toLocaleString('es-CL')}\n\n${selectedEmail.body}`,
    });
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">

      {/* ── Left: Folder nav ────────────────────── */}
      <div className="w-52 flex-shrink-0 border-r border-neutral-100 flex flex-col bg-neutral-50">
        {/* Compose */}
        <div className="p-4">
          <button
            onClick={() => openCompose()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 2v10M2 7h10"/>
            </svg>
            Redactar
          </button>
        </div>

        {/* Folders */}
        <nav className="px-2 space-y-0.5 flex-1">
          <FolderItem
            icon={<InboxIcon />}
            label="Bandeja de entrada"
            badge={unreadCount}
            active={activeFolder === 'inbox'}
            onClick={() => setActiveFolder('inbox')}
          />
          <FolderItem
            icon={<StarIcon />}
            label="Destacados"
            active={activeFolder === 'starred'}
            onClick={() => setActiveFolder('starred')}
          />
          <FolderItem
            icon={<SendIcon />}
            label="Enviados"
            active={activeFolder === 'sent'}
            onClick={() => setActiveFolder('sent')}
          />
          <FolderItem
            icon={<DraftIcon />}
            label="Borradores"
            active={activeFolder === 'drafts'}
            onClick={() => setActiveFolder('drafts')}
          />
        </nav>

        {/* Connected as */}
        <div className="border-t border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Conectado</span>
          </div>
          <p className="text-[11px] text-neutral-600 font-medium truncate">{user?.email ?? 'Sin sesión'}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">Google Workspace</p>
        </div>
      </div>

      {/* ── Center: Email list ───────────────────── */}
      <div className="w-[340px] flex-shrink-0 border-r border-neutral-100 flex flex-col">
        {/* Search */}
        <div className="px-4 py-3 border-b border-neutral-100">
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#9CA3AF" strokeWidth="1.5" className="absolute left-3 top-1/2 -translate-y-1/2">
              <circle cx="6" cy="6" r="4.5"/><path d="M10 10l2.5 2.5"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar correos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-1 focus:ring-primary-100 transition-colors"
            />
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">
              {activeFolder === 'inbox' ? 'Bandeja de entrada' : activeFolder === 'starred' ? 'Destacados' : activeFolder === 'sent' ? 'Enviados' : 'Borradores'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
              usingRealData
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${usingRealData ? 'bg-green-500' : 'bg-amber-500'}`} />
              {usingRealData ? 'Gmail conectado' : 'Datos de demostración'}
            </span>
          </div>
          <span className="text-xs text-neutral-400">{filtered.length} correos</span>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                  <InboxIcon />
                </div>
                <p className="text-sm font-medium text-neutral-600">Sin correos</p>
                <p className="text-xs text-neutral-400 mt-1">Esta carpeta está vacía</p>
              </div>
            ) : (
              filtered.map((email) => (
                <motion.div
                  key={email.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  layout
                >
                  <EmailRow
                    email={email}
                    selected={selectedId === email.id}
                    onClick={() => handleSelect(email.id)}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Right: Email detail ──────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {selectedEmail ? (
            <EmailDetail key={selectedEmail.id} email={selectedEmail} onReply={handleReply} />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center px-8"
            >
              <div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#9CA3AF" strokeWidth="1.3">
                  <rect x="3" y="6" width="22" height="16" rx="2"/><path d="M3 8l11 7 11-7"/>
                </svg>
              </div>
              <p className="text-base font-semibold text-neutral-600">Selecciona un correo</p>
              <p className="text-sm text-neutral-400 mt-1">Elige un correo de la lista para leerlo</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function InboxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="2" width="14" height="12" rx="1.5"/><path d="M1 9h4l1.5 2h3L11 9h4"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5l1.8 4.9H15l-4.2 3 1.6 4.9L8 11.5l-4.4 2.9 1.6-4.9L1 6.4h5.2z"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1.5 8l13-6.5-6.5 13L7 9.5 1.5 8z"/><path d="M7 9.5l6.5-8"/>
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2H4a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5V6L10 2z"/>
      <path d="M10 2v4h3.5M5 8.5h6M5 11h4"/>
    </svg>
  );
}
