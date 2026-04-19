import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { google, gmail_v1 } from 'googleapis';
import { GoogleOAuthService } from './GoogleOAuthService';
import { GmailConnectionOrmEntity } from '../persistence/GmailConnectionOrmEntity';
import { GmailSentMessageOrmEntity } from '../persistence/GmailSentMessageOrmEntity';

/**
 * ==========================================================================
 * Gmail API Service
 * ==========================================================================
 *
 * High-level operations on a user's Gmail account:
 *   - listInbox: fetch message metadata for the UI inbox,
 *   - sendEmail: craft and send an RFC 2822 message (with optional tracking pixel),
 *   - checkReplies: scan sent threads and record first inbound reply timestamps.
 *
 * All methods transparently refresh the stored access_token when it's < 60s
 * from expiry, and persist the new credentials.
 * ==========================================================================
 */

export interface InboxMessage {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string[];
  subject: string;
  snippet: string;
  date: string;
  read: boolean;
  labelIds: string[];
}

export interface SendEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  trackingPixelUrl?: string;
}

@Injectable()
export class GmailApiService {
  private readonly logger = new Logger(GmailApiService.name);

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly oauth: GoogleOAuthService,
  ) {}

  /** Load the active connection for a user, refreshing tokens if needed. */
  private async getConnection(userId: string): Promise<GmailConnectionOrmEntity> {
    const connection = await this.ds.transaction((mgr) =>
      mgr.findOne(GmailConnectionOrmEntity, { where: { userId } }),
    );
    if (!connection) throw new NotFoundException('Gmail not connected for this user');

    // Refresh if token expires in the next 60 seconds.
    const expiresSoon = connection.tokenExpiresAt.getTime() - Date.now() < 60_000;
    if (expiresSoon) {
      try {
        const refreshed = await this.oauth.refreshAccessToken(connection.refreshToken);
        connection.accessToken = refreshed.access_token;
        connection.tokenExpiresAt = refreshed.expires_at;
        await this.ds.transaction(async (mgr) => {
          await mgr.update(
            GmailConnectionOrmEntity,
            { id: connection.id },
            {
              accessToken: refreshed.access_token,
              tokenExpiresAt: refreshed.expires_at,
              updatedAt: new Date(),
            },
          );
        });
      } catch (err) {
        this.logger.error(`Token refresh failed for user ${userId}: ${(err as Error).message}`);
        throw err;
      }
    }
    return connection;
  }

  private gmailClient(connection: GmailConnectionOrmEntity): gmail_v1.Gmail {
    const auth = this.oauth.getAuthenticatedClient({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      tokenExpiresAt: connection.tokenExpiresAt,
    });
    return google.gmail({ version: 'v1', auth });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Inbox listing
  // ───────────────────────────────────────────────────────────────────────

  async listInbox(userId: string, opts: { limit?: number; query?: string } = {}): Promise<InboxMessage[]> {
    const connection = await this.getConnection(userId);
    const gmail = this.gmailClient(connection);

    const maxResults = Math.min(Math.max(1, opts.limit ?? 25), 100);
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: opts.query || 'in:inbox',
    });

    const ids = (list.data.messages ?? []).map((m) => m.id).filter(Boolean) as string[];
    if (ids.length === 0) return [];

    const details = await Promise.all(
      ids.map((id) =>
        gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        }),
      ),
    );

    return details.map((res): InboxMessage => {
      const msg = res.data;
      const headers = msg.payload?.headers ?? [];
      const headerValue = (name: string): string =>
        headers.find((h) => (h.name ?? '').toLowerCase() === name.toLowerCase())?.value ?? '';

      const fromRaw = headerValue('From');
      const subject = headerValue('Subject');
      const dateRaw = headerValue('Date');
      const toRaw   = headerValue('To');

      // Parse "Name <email@x>" → { name, email }
      const parseAddr = (raw: string) => {
        const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(raw);
        if (m) return { name: m[1].trim() || m[2].trim(), email: m[2].trim() };
        return { name: raw.trim(), email: raw.trim() };
      };

      const from = parseAddr(fromRaw);
      const labelIds = msg.labelIds ?? [];
      const read = !labelIds.includes('UNREAD');

      const date = (() => {
        if (msg.internalDate) return new Date(Number(msg.internalDate)).toISOString();
        if (dateRaw) {
          const d = new Date(dateRaw);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
        return new Date().toISOString();
      })();

      return {
        id: msg.id ?? '',
        threadId: msg.threadId ?? '',
        from: from.name,
        fromEmail: from.email,
        to: toRaw ? toRaw.split(',').map((s) => s.trim()) : [],
        subject,
        snippet: msg.snippet ?? '',
        date,
        read,
        labelIds,
      };
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Send
  // ───────────────────────────────────────────────────────────────────────

  private buildRfc2822(params: {
    from: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    htmlBody: string;
  }): string {
    const lines: string[] = [];
    lines.push(`From: ${params.from}`);
    lines.push(`To: ${params.to}`);
    if (params.cc)  lines.push(`Cc: ${params.cc}`);
    if (params.bcc) lines.push(`Bcc: ${params.bcc}`);
    // RFC 2047 encode subject to handle non-ASCII characters.
    const encodedSubject = /[^\x20-\x7E]/.test(params.subject)
      ? `=?UTF-8?B?${Buffer.from(params.subject, 'utf8').toString('base64')}?=`
      : params.subject;
    lines.push(`Subject: ${encodedSubject}`);
    lines.push('MIME-Version: 1.0');
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: base64');
    lines.push('');
    lines.push(Buffer.from(params.htmlBody, 'utf8').toString('base64'));
    return lines.join('\r\n');
  }

  async sendEmail(userId: string, input: SendEmailInput): Promise<{ messageId: string; threadId: string }> {
    const connection = await this.getConnection(userId);
    const gmail = this.gmailClient(connection);

    // Body can be plain text → wrap as minimal HTML so the tracking pixel sits
    // naturally at the end of the rendered message.
    const bodyHtml = input.body.includes('<') && input.body.includes('>')
      ? input.body
      : `<div style="white-space:pre-wrap">${input.body
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</div>`;

    const pixel = input.trackingPixelUrl
      ? `<img src="${input.trackingPixelUrl}" width="1" height="1" style="display:none" alt=""/>`
      : '';

    const htmlBody = `${bodyHtml}${pixel}`;

    const rfc = this.buildRfc2822({
      from: connection.email,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject ?? '',
      htmlBody,
    });

    const raw = Buffer.from(rfc, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return {
      messageId: res.data.id ?? '',
      threadId: res.data.threadId ?? '',
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Reply tracking
  // ───────────────────────────────────────────────────────────────────────

  // ───────────────────────────────────────────────────────────────────────
  // CRM sync: auto-discover contacts & companies from inbox senders
  // ───────────────────────────────────────────────────────────────────────

  private static readonly COMMON_DOMAINS = new Set([
    'gmail.com','googlemail.com','google.com',
    'outlook.com','hotmail.com','live.com','msn.com','windowslive.com','hotmail.es','live.cl',
    'yahoo.com','yahoo.es','yahoo.co.uk','yahoo.com.ar','ymail.com','yahoo.cl',
    'icloud.com','me.com','mac.com','apple.com',
    'aol.com','aim.com',
    'protonmail.com','proton.me','pm.me',
    'zoho.com','zohocorp.com',
    'tutanota.com','tutamail.com',
    'mail.com','inbox.com','gmx.com','gmx.net',
    'yandex.com','yandex.ru',
    'qq.com','163.com','126.com',
    'naver.com','daum.net',
  ]);

  /**
   * Fetch recent inbox senders and upsert them as CRM contacts/companies.
   * Returns counts of created and skipped records.
   */
  async syncContacts(
    userId: string,
    tenantId: string,
    opts: { maxMessages?: number } = {},
  ): Promise<{ contactsCreated: number; contactsSkipped: number; companiesCreated: number; companiesSkipped: number }> {
    const connection = await this.getConnection(userId);
    const gmail = this.gmailClient(connection);

    const maxResults = Math.min(opts.maxMessages ?? 200, 500);
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: 'in:inbox',
    });

    const msgIds = (listRes.data.messages ?? []).map((m) => m.id).filter(Boolean) as string[];
    if (msgIds.length === 0) return { contactsCreated: 0, contactsSkipped: 0, companiesCreated: 0, companiesSkipped: 0 };

    // Batch-fetch From headers only — much cheaper than full messages.
    const froms = await Promise.all(
      msgIds.map((id) =>
        gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['From'] })
          .then((r) => r.data.payload?.headers?.find((h) => h.name === 'From')?.value ?? '')
          .catch(() => ''),
      ),
    );

    // Parse "Display Name <email@domain.com>" or bare "email@domain.com"
    const parsed: Array<{ name: string; email: string; domain: string }> = [];
    const seen = new Set<string>();
    const ownEmail = connection.email.toLowerCase();

    for (const from of froms) {
      const m = from.match(/^(?:"?(.+?)"?\s+)?<?([^\s<>]+@[^\s<>]+)>?$/);
      if (!m) continue;
      const email = m[2].toLowerCase().trim();
      if (!email.includes('@')) continue;
      if (email === ownEmail) continue;      // skip own address
      if (seen.has(email)) continue;
      seen.add(email);
      const domain = email.split('@')[1];
      const name = (m[1] ?? '').trim() || email.split('@')[0];
      parsed.push({ name, email, domain });
    }

    let contactsCreated = 0;
    let contactsSkipped = 0;
    let companiesCreated = 0;
    let companiesSkipped = 0;

    // ── Upsert contacts ──────────────────────────────────────────────────
    const nowIso = new Date().toISOString();
    const meta = { source: 'MANUAL', updatedAt: nowIso, updatedBy: userId };
    for (const { name, email } of parsed) {
      const exists = await this.ds.query(
        `SELECT id FROM crm_records WHERE tenant_id = $1 AND object_type = 'contacts' AND email = $2 LIMIT 1`,
        [tenantId, email],
      );
      if (exists.length > 0) {
        contactsSkipped++;
        continue;
      }
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0] ?? '';
      const lastName  = parts.slice(1).join(' ');
      const properties: Record<string, unknown> = {
        first_name: { value: firstName, ...meta },
        last_name:  { value: lastName,  ...meta },
        email:      { value: email,     ...meta },
        source:     'gmail_import',
        imported_at: nowIso,
      };
      await this.ds.query(
        `INSERT INTO crm_records
           (tenant_id, object_type, email, display_name, properties, created_by, lifecycle_stage)
         VALUES ($1, 'contacts', $2, $3, $4::jsonb, $5, 'lead')
         ON CONFLICT DO NOTHING`,
        [tenantId, email, name, JSON.stringify(properties), userId],
      );
      contactsCreated++;
    }

    // ── Upsert companies (corporate domains only) ────────────────────────
    const uniqueDomains = [...new Set(parsed.map((p) => p.domain))].filter(
      (d) => !GmailApiService.COMMON_DOMAINS.has(d),
    );

    for (const domain of uniqueDomains) {
      const exists = await this.ds.query(
        `SELECT id FROM crm_records WHERE tenant_id = $1 AND object_type = 'companies' AND domain = $2 LIMIT 1`,
        [tenantId, domain],
      );
      if (exists.length > 0) {
        companiesSkipped++;
        continue;
      }
      // Derive a company name from the domain: "acme.com" → "Acme"
      const companyName = domain.split('.')[0].replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      const properties: Record<string, unknown> = {
        name:   { value: companyName, ...meta },
        domain: { value: domain,      ...meta },
        source: 'gmail_import',
        imported_at: nowIso,
      };
      await this.ds.query(
        `INSERT INTO crm_records
           (tenant_id, object_type, domain, display_name, properties, created_by, lifecycle_stage)
         VALUES ($1, 'companies', $2, $3, $4::jsonb, $5, 'lead')
         ON CONFLICT DO NOTHING`,
        [tenantId, domain, companyName, JSON.stringify(properties), userId],
      );
      companiesCreated++;
    }

    return { contactsCreated, contactsSkipped, companiesCreated, companiesSkipped };
  }

  /** Scan outstanding sent-messages threads and record the first inbound reply. */
  async checkReplies(userId: string): Promise<number> {
    const connection = await this.getConnection(userId);
    const gmail = this.gmailClient(connection);

    const outstanding = await this.ds.transaction((mgr) =>
      mgr.find(GmailSentMessageOrmEntity, {
        where: { userId, firstReplyAt: null as unknown as Date },
      }),
    );

    let updated = 0;
    for (const row of outstanding) {
      if (!row.gmailThreadId || !row.gmailMessageId) continue;
      try {
        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: row.gmailThreadId,
          format: 'metadata',
          metadataHeaders: ['From', 'Date'],
        });
        const messages = thread.data.messages ?? [];
        // A reply is any message in the thread newer than our sent one AND not
        // sent by us. Gmail puts the user's own address on the SENT label.
        const reply = messages.find((m) => {
          if (m.id === row.gmailMessageId) return false;
          const internal = Number(m.internalDate ?? 0);
          if (!internal || internal <= row.sentAt.getTime()) return false;
          const isOwn = (m.labelIds ?? []).includes('SENT');
          return !isOwn;
        });
        if (reply && reply.internalDate) {
          await this.ds.transaction(async (mgr) => {
            await mgr.update(
              GmailSentMessageOrmEntity,
              { id: row.id },
              { firstReplyAt: new Date(Number(reply.internalDate)) },
            );
          });
          updated += 1;
        }
      } catch (err) {
        this.logger.warn(`checkReplies: thread ${row.gmailThreadId} failed: ${(err as Error).message}`);
      }
    }
    return updated;
  }
}
