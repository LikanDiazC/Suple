import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { GmailSentMessageOrmEntity } from '../../infrastructure/persistence/GmailSentMessageOrmEntity';
import { TenantContext } from '../../../../shared/infrastructure/TenantContext';

/**
 * ==========================================================================
 * Gmail Tracking Pixel Controller
 * ==========================================================================
 *
 * Public endpoint (excluded from TenantMiddleware in app.module.ts).
 * Returns a 1x1 transparent PNG and, as a side-effect, increments the
 * open_count + first_opened_at on the matching gmail_sent_messages row.
 *
 * Because there is no JWT on this request, we look up the tenant_id from
 * the sent-message row itself using a non-RLS query, then SET LOCAL the
 * tenant for the update so RLS lets us through.
 * ==========================================================================
 */

// 1x1 transparent PNG (43 bytes).
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

@Controller('api/gmail/tracking')
export class GmailTrackingController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  @Get(':token.png')
  async pixel(@Param('token') token: string, @Res() res: Response) {
    // Guard: always return the pixel even on malformed/stale tokens so we
    // never leak "this token is real" vs "this token is fake" via HTTP status.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      try {
        // Look up the row WITHOUT RLS (superuser/bypass) — use a direct query
        // and then run the update inside a TenantContext so RLS allows it.
        const rows = await this.ds.query<{ tenant_id: string; id: string; first_opened_at: Date | null }[]>(
          'SELECT id, tenant_id, first_opened_at FROM gmail_sent_messages WHERE tracking_token = $1 LIMIT 1',
          [token],
        );
        const row = rows[0];
        if (row) {
          await TenantContext.run({ tenantId: row.tenant_id, roles: [] }, async () => {
            await this.ds.transaction(async (mgr) => {
              if (row.first_opened_at) {
                await mgr.query(
                  'UPDATE gmail_sent_messages SET open_count = open_count + 1 WHERE id = $1',
                  [row.id],
                );
              } else {
                await mgr.update(
                  GmailSentMessageOrmEntity,
                  { id: row.id },
                  { firstOpenedAt: new Date(), openCount: 1 },
                );
              }
            });
          });
        }
      } catch {
        // swallow errors — tracking must never break the email client's render
      }
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Length', String(PIXEL_PNG.length));
    res.status(200).send(PIXEL_PNG);
  }
}
