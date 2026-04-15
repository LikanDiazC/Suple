import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google';

/**
 * Dynamic API route for CRM object records.
 * GET /api/crm/contacts?page=1&limit=25&sort=create_date&order=desc&search=...
 * GET /api/crm/companies?page=1&limit=25
 *
 * Uses Google People API when a valid Google session is available.
 * Falls back to hardcoded demo data when not authenticated.
 */

// ---------------------------------------------------------------------------
// Fallback demo data (used when Google session is unavailable)
// ---------------------------------------------------------------------------

const CONTACTS_FALLBACK = [
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

const COMPANIES_FALLBACK = [
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

// Personal / generic email domains — skip these when inferring companies from email
const PERSONAL_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com',
  'icloud.com', 'live.com', 'msn.com', 'me.com',
]);

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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

  let records: { id: string; properties: Record<string, string> }[] = [];

  // ── Try Google People API when user is authenticated ──────────────────────
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Skip People API if token is missing or refresh failed (expired token)
  const canUsePeopleApi =
    token?.accessToken &&
    token.error !== 'RefreshAccessTokenError' &&
    (objectType === 'contacts' || objectType === 'companies');

  if (canUsePeopleApi) {
    try {
      const oauth2Client = getOAuth2Client(token!.accessToken as string);
      const people = google.people({ version: 'v1', auth: oauth2Client });

      const res = await people.people.connections.list({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,phoneNumbers,organizations,metadata',
        pageSize: 500,
      });

      const connections = res.data.connections ?? [];
      const now = new Date().toISOString();

      if (objectType === 'contacts') {
        records = connections.map((person, i) => {
          const displayName = person.names?.[0]?.displayName ?? '';
          const nameParts = displayName.trim().split(/\s+/);
          const firstName = nameParts[0] ?? '';
          const lastName = nameParts.slice(1).join(' ');
          const email = person.emailAddresses?.[0]?.value ?? '';
          const phone = person.phoneNumbers?.[0]?.value ?? '';
          // Use the most recent source update time as last_activity
          const lastActivity =
            person.metadata?.sources?.sort((a, b) =>
              (b.updateTime ?? '').localeCompare(a.updateTime ?? ''),
            )?.[0]?.updateTime ?? now;

          return {
            id: `google_c_${i}`,
            properties: {
              first_name: firstName,
              last_name: lastName,
              email,
              phone,
              lead_status: '',
              content_topics: '',
              preferred_channels: '',
              create_date: now,
              last_activity: lastActivity,
            },
          };
        });
      } else {
        // companies — extract unique organizations + infer from email domains
        const orgMap = new Map<string, { name: string; domain: string; lastActivity: string }>();

        for (const person of connections) {
          const email = person.emailAddresses?.[0]?.value ?? '';
          const domain = email.includes('@') ? email.split('@')[1].toLowerCase() : '';
          const lastActivity =
            person.metadata?.sources?.sort((a, b) =>
              (b.updateTime ?? '').localeCompare(a.updateTime ?? ''),
            )?.[0]?.updateTime ?? now;

          // 1. Named organizations from Google contacts
          for (const org of person.organizations ?? []) {
            const name = org.name?.trim();
            if (!name) continue;
            const key = name.toLowerCase();
            if (!orgMap.has(key)) {
              orgMap.set(key, {
                name,
                domain: org.domain?.trim() ?? domain,
                lastActivity,
              });
            }
          }

          // 2. Infer company from professional email domain (no named org found)
          if (
            (person.organizations ?? []).length === 0 &&
            domain &&
            !PERSONAL_DOMAINS.has(domain)
          ) {
            const key = domain;
            if (!orgMap.has(key)) {
              // Capitalize the domain prefix as the company name
              const baseName = domain.split('.')[0];
              const guessedName =
                baseName.charAt(0).toUpperCase() + baseName.slice(1);
              orgMap.set(key, {
                name: guessedName,
                domain,
                lastActivity,
              });
            }
          }
        }

        records = Array.from(orgMap.values()).map((org, i) => ({
          id: `google_co_${i}`,
          properties: {
            name: org.name,
            domain: org.domain,
            owner_id: 'Sin propietario',
            phone: '',
            city: '',
            lead_status: '',
            create_date: now,
            last_activity: org.lastActivity,
          },
        }));
      }
    } catch (err) {
      const gaxios = err as { response?: { status: number } };
      console.error(
        `[CRM] Google People API error for ${objectType} (HTTP ${gaxios?.response?.status ?? 'unknown'}):`,
        (err as Error).message,
      );
      // Fall back to demo data on any error (expired token, API not enabled, etc.)
      records = objectType === 'contacts' ? CONTACTS_FALLBACK : COMPANIES_FALLBACK;
    }

    // If People API returned 0 connections, fall back to demo data
    if (records.length === 0 && (objectType === 'contacts' || objectType === 'companies')) {
      records = objectType === 'contacts' ? CONTACTS_FALLBACK : COMPANIES_FALLBACK;
    }
  } else {
    // No Google session or token expired — use demo data
    records =
      objectType === 'contacts'
        ? CONTACTS_FALLBACK
        : objectType === 'companies'
          ? COMPANIES_FALLBACK
          : [];
  }

  // ── Search filter ─────────────────────────────────────────────────────────
  if (search) {
    records = records.filter((r) => {
      const values = Object.values(r.properties).map((v) => String(v).toLowerCase());
      return values.some((v) => v.includes(search));
    });
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  records = [...records].sort((a, b) => {
    const aVal = String(a.properties[sortBy] ?? '');
    const bVal = String(b.properties[sortBy] ?? '');
    return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  // ── Paginate ──────────────────────────────────────────────────────────────
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
