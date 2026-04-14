import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic API route for CRM object records.
 * GET /api/crm/contacts?page=1&limit=25&sort=create_date&order=desc&search=...
 * GET /api/crm/companies?page=1&limit=25
 */

const CONTACTS = [
  { id: 'c1', properties: { first_name: 'UDLA | Universidad d...', last_name: '', email: 'admision@udla.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-14T11:04:00Z' }},
  { id: 'c2', properties: { first_name: 'App Copec', last_name: '', email: 'contacto@appcopec.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-03-28T16:18:00Z' }},
  { id: 'c3', properties: { first_name: 'Tom Turpel', last_name: 'from AVEVA', email: 'webseminars@aveva.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-16T13:03:00Z' }},
  { id: 'c4', properties: { first_name: 'Pases', last_name: 'Parques', email: 'no-responder@pasesparques.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-16T23:52:00Z' }},
  { id: 'c5', properties: { first_name: 'Admision', last_name: 'Duoc UC', email: 'admisionduocuc@duoc.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-19T19:08:00Z' }},
  { id: 'c6', properties: { first_name: 'Clave Tributaria', last_name: 'SII', email: 'webadm@sii.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-20T22:19:00Z' }},
  { id: 'c7', properties: { first_name: 'Christian Struve', last_name: '- Fracttal', email: 'communication@fracttal.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-21T11:48:00Z' }},
  { id: 'c8', properties: { first_name: 'likanaquilesdiazcalbu...', last_name: '', email: 'likanaquilesdiazcalbuqueo@gmail.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-04-04T17:39:00Z' }},
  { id: 'c9', properties: { first_name: 'Cuarta Notaria', last_name: 'La Cisterna', email: 'contacto@cuartanotariala.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-28T14:33:00Z' }},
  { id: 'c10', properties: { first_name: 'Felipe', last_name: 'Carrasco', email: 'fcarrasco@ici-ingenieria.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-29T08:21:00Z' }},
  { id: 'c11', properties: { first_name: 'Ripley', last_name: '.com', email: 'mensajeriaripley@ripley.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-02-03T16:21:00Z' }},
  { id: 'c12', properties: { first_name: 'The Google', last_name: 'Workspace', email: 'workspace@google.com', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-02-07T18:13:00Z' }},
  { id: 'c13', properties: { first_name: 'Orrego Torres', last_name: 'Maria', email: 'maria.orrego@scotiabank.cl', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-02-18T16:21:00Z' }},
  { id: 'c14', properties: { first_name: 'Napkin', last_name: 'AI', email: 'contact@napkin.ai', phone: '', lead_status: '', content_topics: '', preferred_channels: '', create_date: '2026-03-25T17:31:00Z', last_activity: '2026-04-09T09:39:00Z' }},
];

const COMPANIES = [
  { id: 'co1', properties: { name: 'University of Las Americas', domain: 'udla.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-14T11:04:00Z' }},
  { id: 'co2', properties: { name: '--', domain: '', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-03-28T16:18:00Z' }},
  { id: 'co3', properties: { name: 'AVEVA Group plc', domain: 'aveva.com', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-16T13:03:00Z' }},
  { id: 'co4', properties: { name: 'Pases Digitales Parques', domain: 'pasesparques.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-16T23:52:00Z' }},
  { id: 'co5', properties: { name: 'Duoc UC', domain: 'duoc.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-19T19:08:00Z' }},
  { id: 'co6', properties: { name: 'Servicio de Impuestos Internos', domain: 'sii.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-20T22:19:00Z' }},
  { id: 'co7', properties: { name: 'Fracttal', domain: 'fracttal.com', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-21T11:48:00Z' }},
  { id: 'co8', properties: { name: 'ICI Ingenieria', domain: 'ici-ingenieria.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:32:00Z', last_activity: '2026-01-29T08:21:00Z' }},
  { id: 'co9', properties: { name: 'Google', domain: 'google.com', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:31:00Z', last_activity: '2026-02-07T18:13:00Z' }},
  { id: 'co10', properties: { name: 'Napkin AI', domain: 'napkin.ai', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:31:00Z', last_activity: '2026-04-09T09:39:00Z' }},
  { id: 'co11', properties: { name: 'BancoEstado', domain: 'bancoestado.cl', owner_id: 'Sin propietario', phone: '', city: '', lead_status: '', create_date: '2026-03-25T17:31:00Z', last_activity: '2026-02-18T09:22:00Z' }},
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectType: string }> },
) {
  const { objectType } = await params;
  const url = request.nextUrl;
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = parseInt(url.searchParams.get('limit') ?? '25');
  const search = url.searchParams.get('search')?.toLowerCase() ?? '';
  const sortBy = url.searchParams.get('sort') ?? 'create_date';
  const order = url.searchParams.get('order') ?? 'desc';

  let records: { id: string; properties: Record<string, string> }[] =
    objectType === 'contacts' ? CONTACTS : objectType === 'companies' ? COMPANIES : [];

  // Search filter
  if (search) {
    records = records.filter((r) => {
      const values = Object.values(r.properties).map((v) => String(v).toLowerCase());
      return values.some((v) => v.includes(search));
    });
  }

  // Sort
  records = [...records].sort((a, b) => {
    const aVal = String(a.properties[sortBy] ?? '');
    const bVal = String(b.properties[sortBy] ?? '');
    return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const total = records.length;
  const start = (page - 1) * limit;
  const paged = records.slice(start, start + limit);

  return NextResponse.json({
    results: paged,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
