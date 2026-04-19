import { Request } from 'express';
import { UnauthorizedException } from '@nestjs/common';

/**
 * Extracts the tenantId set by TenantMiddleware after JWT validation.
 * Throws if absent — controllers MUST be behind TenantMiddleware.
 */
export function resolveTenantId(req: Request): string {
  const tenantId = req.authenticatedUser?.tenantId;
  if (!tenantId) {
    throw new UnauthorizedException('Missing tenant context — request not authenticated');
  }
  return tenantId;
}
