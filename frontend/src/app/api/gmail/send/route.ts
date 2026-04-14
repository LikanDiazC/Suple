import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { google } from 'googleapis';
import { getOAuth2Client } from '@/lib/google';

/**
 * POST /api/gmail/send
 * Sends an email via the Gmail API.
 * Body: { to: string, subject: string, body: string, from: string }
 */
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token?.accessToken || token.error === 'RefreshAccessTokenError') {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const { to, subject, body, from } = (await req.json()) as {
      to: string;
      subject: string;
      body: string;
      from: string;
    };

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const oauth2Client = getOAuth2Client(token.accessToken as string);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build RFC 2822 formatted email
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      body,
    ];
    const rawMessage = messageParts.join('\r\n');

    // Base64url encode the message
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return NextResponse.json(
      {
        success: true,
        messageId: sendRes.data.id,
        threadId: sendRes.data.threadId,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[POST /api/gmail/send]', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
