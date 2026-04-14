import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google';

/**
 * GET /api/gmail
 * Fetches the 20 most recent inbox messages with metadata.
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
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      q: 'in:inbox',
    });

    const messageIds = listRes.data.messages ?? [];

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
        const fromName  = emailMatch
          ? rawFrom.replace(/<[^>]+>/, '').trim().replace(/^"|"$/g, '')
          : rawFrom.split('@')[0];

        return {
          id: detail.data.id,
          from: fromName || fromEmail,
          fromEmail,
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: detail.data.snippet ?? '',
          isUnread: labels.includes('UNREAD'),
          isStarred: labels.includes('STARRED'),
        };
      }),
    );

    return NextResponse.json(messages, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GET /api/gmail]', error);
    return NextResponse.json(
      { error: 'Failed to fetch inbox messages' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
