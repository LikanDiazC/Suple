import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google';

/**
 * GET /api/contacts
 * Fetches Google contacts for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.accessToken) {
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
