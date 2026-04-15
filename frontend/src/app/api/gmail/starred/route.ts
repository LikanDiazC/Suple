import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * GET /api/gmail/starred
 * Fetches up to 10 starred messages.
 * Returns an array of GmailMessage objects (same format as /api/gmail).
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken as string });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'is:starred',
    });

    const messageIds = listRes.data.messages ?? [];

    // Empty inbox — return empty array (not an error)
    if (messageIds.length === 0) {
      return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
    }

    const messages = await Promise.all(
      messageIds.map(async (msg) => {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const headers = detail.data.payload?.headers ?? [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name === name)?.value ?? '';

        const labels = detail.data.labelIds ?? [];

        // Parse "Display Name <email@domain.com>" → name + email separately
        const rawFrom = getHeader('From');
        const emailMatch = rawFrom.match(/<([^>]+)>/);
        const fromEmail = emailMatch ? emailMatch[1] : rawFrom.trim();
        const fromName = emailMatch
          ? rawFrom.replace(/<[^>]+>/, '').trim().replace(/^"|"$/g, '')
          : rawFrom.split('@')[0];

        return {
          id: detail.data.id ?? msg.id,
          from: fromName || fromEmail,
          fromEmail,
          subject: getHeader('Subject') || '(Sin asunto)',
          date: getHeader('Date'),
          snippet: detail.data.snippet ?? '',
          isUnread: labels.includes('UNREAD'),
          isStarred: true,
          labelIds: labels,
        };
      }),
    );

    return NextResponse.json(messages, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    const gaxios = error as { response?: { status: number; data?: unknown }; message?: string };
    console.error('[GET /api/gmail/starred]', gaxios?.response?.data ?? gaxios?.message ?? error);

    // Google returned 401 → token expired, treat as unauthenticated
    if (gaxios?.response?.status === 401) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Error al obtener correos destacados' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
