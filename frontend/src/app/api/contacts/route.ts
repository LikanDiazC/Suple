import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google';
import { isDemoRequest } from '@/lib/demoMode';

const DEMO_CONTACTS = [
  { id: 'demo-c1', name: 'Felipe Carrasco', email: 'fcarrasco@ici-ingenieria.cl', phone: '+56 9 8765 4321', company: 'ICI Ingenieria', photoUrl: '' },
  { id: 'demo-c2', name: 'Maria Orrego Torres', email: 'maria.orrego@scotiabank.cl', phone: '+56 2 2345 6789', company: 'Scotiabank', photoUrl: '' },
  { id: 'demo-c3', name: 'Tom Turpel', email: 'webseminars@aveva.com', phone: '', company: 'AVEVA Group', photoUrl: '' },
];

/**
 * GET /api/contacts
 * Fetches Google contacts for the authenticated user.
 * In demo mode returns static demo contacts.
 */
export async function GET(req: NextRequest) {
  try {
    // Demo mode → return demo contacts, no Google API call.
    if (isDemoRequest(req)) {
      return NextResponse.json(DEMO_CONTACTS, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.accessToken || token.error === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const oauth2Client = getOAuth2Client(token.accessToken as string);
    const people = google.people({ version: 'v1', auth: oauth2Client });

    const res = await people.people.connections.list({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
      pageSize: 100,
    });

    const connections = res.data.connections ?? [];

    const contacts = connections.map((person) => ({
      id: person.resourceName ?? '',
      name: person.names?.[0]?.displayName ?? '',
      email: person.emailAddresses?.[0]?.value ?? '',
      phone: person.phoneNumbers?.[0]?.value ?? '',
      company: person.organizations?.[0]?.name ?? '',
      photoUrl: person.photos?.[0]?.url ?? '',
    }));

    return NextResponse.json(contacts, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GET /api/contacts]', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
