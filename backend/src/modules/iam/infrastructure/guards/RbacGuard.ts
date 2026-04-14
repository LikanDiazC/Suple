import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../middleware/TenantMiddleware';

/**
 * ==========================================================================
 * RBAC / ABAC Authorization Guard
 * ==========================================================================
 *
 * Combines Role-Based and Attribute-Based Access Control:
 *
 * RBAC: Checks if the user holds at least one of the required permissions
 *       (derived from their assigned roles).
 *
 * ABAC: Evaluates attribute-based policies when more granular control
 *       is needed (e.g., "user.department === 'finance' AND action === 'close_period'").
 *
 * Usage in controllers:
 *   @RequirePermissions('erp:journal:write', 'erp:journal:read')
 *   @RequireAttributes({ department: 'finance' })
 *   @Get('/journal')
 *   async getJournal() { ... }
 * ==========================================================================
 */

export const PERMISSIONS_KEY = 'required_permissions';
export const ATTRIBUTES_KEY = 'required_attributes';

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireAttributes = (attributes: Record<string, string | number | boolean>) =>
  SetMetadata(ATTRIBUTES_KEY, attributes);

@Injectable()
export class RbacAbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const requiredAttributes = this.reflector.getAllAndOverride<
      Record<string, string | number | boolean>
    >(ATTRIBUTES_KEY, [context.getHandler(), context.getClass()]);

    // If no decorators are applied, allow access (public endpoint).
    if (!requiredPermissions && !requiredAttributes) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.authenticatedUser;

    if (!user) {
      throw new ForbiddenException('No authenticated context available');
    }

    // --- RBAC Check ---
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.some((perm) =>
        user.permissions.includes(perm),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Insufficient permissions. Required: [${requiredPermissions.join(', ')}]`,
        );
      }
    }

    // --- ABAC Check ---
    if (requiredAttributes) {
      for (const [key, expectedValue] of Object.entries(requiredAttributes)) {
        const actualValue = user.attributes[key];
        if (actualValue !== expectedValue) {
          throw new ForbiddenException(
            `Attribute policy violation: ${key} expected "${expectedValue}", got "${actualValue}"`,
          );
        }
      }
    }

    return true;
  }
}
