/**
 * Centralized demo data for all modules.
 *
 * When the app runs in demo mode, every page and API route pulls data
 * exclusively from here — no external API calls are made.
 */

// ── Gmail / Email demo data ─────────────────────────────────────────────────

export interface DemoEmail {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
}

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export const DEMO_INBOX: DemoEmail[] = [
  { id: 'demo-1', from: 'Cencosud Retail', fromEmail: 'compras@cencosud.cl', subject: 'Confirmacion OC #4892 — Aprobada', snippet: 'Estimados, confirmamos la aprobacion de la orden de compra...', date: minutesAgo(25), isUnread: true, isStarred: true },
  { id: 'demo-2', from: 'UDLA Universidad', fromEmail: 'proyectos@udla.cl', subject: 'Re: Propuesta modulo SCM Q2 2026', snippet: 'Hemos revisado la propuesta y tenemos algunas consultas...', date: minutesAgo(60), isUnread: true, isStarred: true },
  { id: 'demo-3', from: 'Fracttal SpA', fromEmail: 'pagos@fracttal.com', subject: 'Factura #1002 — Pago recibido', snippet: 'Le informamos que hemos recibido su pago correctamente...', date: minutesAgo(120), isUnread: false, isStarred: true },
  { id: 'demo-4', from: 'Banco Estado', fromEmail: 'notificaciones@bancoestado.cl', subject: 'Notificacion transferencia recibida', snippet: 'Se ha registrado una transferencia en su cuenta...', date: minutesAgo(180), isUnread: false, isStarred: false },
  { id: 'demo-5', from: 'Sodimac S.A.', fromEmail: 'despacho@sodimac.cl', subject: 'Actualizacion estado pedido #7712', snippet: 'Su pedido ha sido despachado y esta en camino...', date: minutesAgo(1440), isUnread: false, isStarred: false },
];

export const DEMO_STARRED: DemoEmail[] = DEMO_INBOX.filter((e) => e.isStarred);
