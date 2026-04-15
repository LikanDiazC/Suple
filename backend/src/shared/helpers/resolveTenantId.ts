import { Request } from 'express';

/**
 * Extracts the tenantId from the request context.
 *
 * Resolution order:
 *   1. `req.authenticatedUser.tenantId` — set by TenantMiddleware after JWT validation.
 *   2. `x-tenant-id` header — dev-mode fallback when route is excluded from middleware.
 *   3. `'tnt_demo01'` — last-resort default for local development.
 *
 * Shared across all controllers to avoid duplication.
 */
export function resolveTenantId(req: Request): string {
  const user = (req as Record<string, any>).authenticatedUser;
  if (user?.tenantId) return user.tenantId;

  const header = req.headers['x-tenant-id'];
  if (typeof header === 'string' && header) return header;

  return 'tnt_demo01';
}
