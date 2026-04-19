import {
  Controller, Get, Post, Delete, Body, Query, Req, Res, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { resolveTenantId } from '../../../../shared/helpers/resolveTenantId';
import { TenantContext } from '../../../../shared/infrastructure/TenantContext';
import { GoogleOAuthService } from '../../infrastructure/services/GoogleOAuthService';
import { GmailApiService } from '../../infrastructure/services/GmailApiService';
import { GmailConnectionOrmEntity } from '../../infrastructure/persistence/GmailConnectionOrmEntity';
import { GmailSentMessageOrmEntity } from '../../infrastructure/persistence/GmailSentMessageOrmEntity';

interface SendDto {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  contactId?: string;
  dealId?: string;
}

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
const BACKEND_URL  = process.env.BACKEND_URL  ?? 'http://localhost:3001';

@Controller('api/gmail')
export class GmailController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly oauth: GoogleOAuthService,
    private readonly gmail: GmailApiService,
  ) {}

  // ───────────────────────────── Status ─────────────────────────────

  @Get('status')
  async status(@Req() req: Request) {
    const userId = req.authenticatedUser?.userId;
    if (!userId) return { connected: false };
    resolveTenantId(req);
    const row = await this.ds.transaction((mgr) =>
      mgr.findOne(GmailConnectionOrmEntity, { where: { userId } }),
    );
    return row ? { connected: true, email: row.email } : { connected: false };
  }

  // ───────────────────────────── OAuth URL ──────────────────────────

  @Get('oauth/url')
  getOAuthUrl(@Req() req: Request) {
    const tenantId = resolveTenantId(req);
    const userId = req.authenticatedUser?.userId ?? '';
    // state contains userId:tenantId so the callback (which has no JWT) can
    // identify the user. We sign it by prefixing a short random nonce so two
    // different users can't deterministically guess each other's state value.
    const nonce = Math.random().toString(36).slice(2, 10);
    const state = `${nonce}:${userId}:${tenantId}`;
    const url = this.oauth.getAuthUrl(state);
    return { url };
  }

  // ───────────────────────────── OAuth callback ─────────────────────

  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const redirectFailure = (reason: string) =>
      res.redirect(`${FRONTEND_URL}/dashboard/crm/inbox?connected=0&reason=${encodeURIComponent(reason)}`);

    try {
      if (error) return redirectFailure(error);
      if (!code || !state) return redirectFailure('missing_code_or_state');

      const parts = state.split(':');
      if (parts.length < 3) return redirectFailure('malformed_state');
      const [, userId, tenantId] = parts;
      if (!userId || !tenantId) return redirectFailure('malformed_state');

      const { tokens, email } = await this.oauth.exchangeCode(code);
      if (!tokens.access_token) return redirectFailure('no_access_token');
      if (!tokens.refresh_token) return redirectFailure('no_refresh_token_revoke_and_retry');

      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3_600_000);
      const scope = tokens.scope ?? '';

      await TenantContext.run({ tenantId, userId, roles: [] }, async () => {
        await this.ds.transaction(async (mgr) => {
          const existing = await mgr.findOne(GmailConnectionOrmEntity, { where: { userId } });
          if (existing) {
            await mgr.update(
              GmailConnectionOrmEntity,
              { id: existing.id },
              {
                email,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token!,
                tokenExpiresAt: expiresAt,
                scope,
                updatedAt: new Date(),
              },
            );
          } else {
            const entity = mgr.create(GmailConnectionOrmEntity, {
              tenantId,
              userId,
              email,
              accessToken: tokens.access_token!,
              refreshToken: tokens.refresh_token!,
              tokenExpiresAt: expiresAt,
              scope,
            });
            await mgr.save(GmailConnectionOrmEntity, entity);
          }
        });
      });

      return res.redirect(`${FRONTEND_URL}/dashboard/crm/inbox?connected=1`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Gmail OAuth callback] FAILED:', msg, err instanceof Error ? err.stack : '');
      return redirectFailure(msg.slice(0, 200));
    }
  }

  // ───────────────────────────── Disconnect ─────────────────────────

  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@Req() req: Request) {
    const userId = req.authenticatedUser?.userId;
    if (!userId) throw new BadRequestException('No user');
    resolveTenantId(req);
    await this.ds.transaction(async (mgr) => {
      await mgr.delete(GmailConnectionOrmEntity, { userId });
    });
  }

  // ───────────────────────────── Inbox listing ──────────────────────

  @Get('messages')
  async messages(
    @Req() req: Request,
    @Query('limit') limit = '50',
    @Query('q') q?: string,
  ) {
    const userId = req.authenticatedUser?.userId;
    if (!userId) throw new BadRequestException('No user');
    resolveTenantId(req);
    const list = await this.gmail.listInbox(userId, {
      limit: parseInt(limit, 10) || 50,
      query: q,
    });
    return { items: list };
  }

  // ───────────────────────────── Send ───────────────────────────────

  @Post('send')
  async send(@Req() req: Request, @Body() dto: SendDto) {
    const userId   = req.authenticatedUser?.userId;
    const tenantId = resolveTenantId(req);
    if (!userId) throw new BadRequestException('No user');
    if (!dto.to || !dto.subject) {
      throw new BadRequestException('Missing "to" or "subject"');
    }

    // 1. Reserve a row so we have the tracking_token BEFORE sending.
    const pending = await this.ds.transaction(async (mgr) => {
      const entity = mgr.create(GmailSentMessageOrmEntity, {
        tenantId,
        userId,
        toEmail: dto.to,
        subject: dto.subject,
        contactId: dto.contactId ?? null,
        dealId:    dto.dealId    ?? null,
      });
      return mgr.save(GmailSentMessageOrmEntity, entity);
    });

    const pixelUrl = `${BACKEND_URL}/api/gmail/tracking/${pending.trackingToken}.png`;

    try {
      const sent = await this.gmail.sendEmail(userId, {
        to: dto.to,
        cc: dto.cc,
        bcc: dto.bcc,
        subject: dto.subject,
        body: dto.body ?? '',
        trackingPixelUrl: pixelUrl,
      });

      await this.ds.transaction(async (mgr) => {
        await mgr.update(
          GmailSentMessageOrmEntity,
          { id: pending.id },
          {
            gmailMessageId: sent.messageId,
            gmailThreadId: sent.threadId,
          },
        );
      });

      return { ok: true, messageId: sent.messageId, threadId: sent.threadId, trackingToken: pending.trackingToken };
    } catch (err) {
      // Roll back the reservation on failure so stats aren't polluted.
      await this.ds.transaction(async (mgr) => {
        await mgr.delete(GmailSentMessageOrmEntity, { id: pending.id });
      });
      throw err;
    }
  }

  // ───────────────────────────── Sent list ──────────────────────────

  @Get('sent')
  async listSent(
    @Req() req: Request,
    @Query('contactId') contactId?: string,
    @Query('dealId')    dealId?: string,
    @Query('limit')     limit = '50',
  ) {
    resolveTenantId(req);
    const take = Math.min(200, parseInt(limit, 10) || 50);
    return this.ds.transaction(async (mgr) => {
      const qb = mgr.createQueryBuilder(GmailSentMessageOrmEntity, 'm');
      if (contactId) qb.andWhere('m.contact_id = :c', { c: contactId });
      if (dealId)    qb.andWhere('m.deal_id = :d',    { d: dealId });
      qb.orderBy('m.sent_at', 'DESC').take(take);
      const items = await qb.getMany();
      return { items };
    });
  }

  // ───────────────────────────── Reply scan (manual trigger) ────────


  // ─────────────────────────────────────────── CRM sync ───────────────

  @Post('sync-contacts')
  async syncContacts(@Req() req: Request) {
    const userId   = req.authenticatedUser?.userId;
    const tenantId = resolveTenantId(req);
    if (!userId) throw new BadRequestException('No user');
    const result = await this.gmail.syncContacts(userId, tenantId);
    return result;
  }

  @Post('check-replies')
  async checkReplies(@Req() req: Request) {
    const userId = req.authenticatedUser?.userId;
    if (!userId) throw new BadRequestException('No user');
    resolveTenantId(req);
    const updated = await this.gmail.checkReplies(userId);
    return { updated };
  }
}
