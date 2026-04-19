// ---------------------------------------------------------------------------
// Dashboard widget catalog — kept in a non-page file so Next.js doesn't
// complain about unexpected named exports from page.tsx
// ---------------------------------------------------------------------------

export interface WidgetDef {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  category: 'kpis' | 'charts' | 'lists' | 'modules';
}

export const WIDGET_CATALOG: WidgetDef[] = [
  { id: 'kpis',           label: 'KPIs principales',        description: 'Pipeline, ingresos, campañas y facturas',    defaultEnabled: true,  category: 'kpis' },
  { id: 'revenue-chart',  label: 'Ingresos vs Gastos',       description: 'Gráfico de área — últimos 6 meses',          defaultEnabled: true,  category: 'charts' },
  { id: 'pipeline-chart', label: 'Evolución Pipeline',       description: 'Barras de valor de pipeline por semana',     defaultEnabled: true,  category: 'charts' },
  { id: 'emails',         label: 'Correos importantes',      description: 'Últimos emails destacados',                  defaultEnabled: true,  category: 'lists' },
  { id: 'deals',          label: 'Deals recientes',          description: 'Pipeline de ventas activo',                  defaultEnabled: true,  category: 'lists' },
  { id: 'channel-spend',  label: 'Gasto por canal',          description: 'Marketing — distribución de presupuesto',    defaultEnabled: false,  category: 'charts' },
  { id: 'sii-summary',    label: 'Resumen SII',              description: 'Estado tributario y próximas declaraciones', defaultEnabled: true,  category: 'modules' },
  { id: 'bpms-tasks',     label: 'Tareas BPMS pendientes',   description: 'Tus tareas de flujos activos',               defaultEnabled: true,  category: 'modules' },
  { id: 'scm-status',     label: 'Estado SCM',               description: 'Planchas disponibles y órdenes activas',     defaultEnabled: false, category: 'modules' },
];

export const STORAGE_KEY = 'dashboard_widgets_v2';

export function loadWidgetPrefs(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set(WIDGET_CATALOG.filter(w => w.defaultEnabled).map(w => w.id));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set(WIDGET_CATALOG.filter(w => w.defaultEnabled).map(w => w.id));
}

export function saveWidgetPrefs(enabled: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabled]));
  } catch { /* ignore */ }
}

export const WIDGET_ORDER_KEY = 'dashboard_widget_order_v1';

export function loadWidgetOrder(): string[] {
  if (typeof window === 'undefined') return WIDGET_CATALOG.map(w => w.id);
  try {
    const raw = localStorage.getItem(WIDGET_ORDER_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as string[];
      // ensure all catalog widgets are represented (handle new widgets added later)
      const catalogIds = WIDGET_CATALOG.map(w => w.id);
      const extra = catalogIds.filter(id => !stored.includes(id));
      return [...stored.filter(id => catalogIds.includes(id)), ...extra];
    }
  } catch { /* ignore */ }
  return WIDGET_CATALOG.map(w => w.id);
}

export function saveWidgetOrder(order: string[]) {
  try {
    localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(order));
  } catch { /* ignore */ }
}
