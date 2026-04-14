import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/iam/infrastructure/middleware/TenantMiddleware';

/**
 * Parameter decorator that extracts the verified tenant context
 * from the request. Use in controllers to ensure all downstream
 * repository calls are scoped to the authenticated tenant.
 *
 * Usage:
 *   @Get('/contacts')
 *   async list(@TenantContext() ctx: AuthenticatedUser) {
 *     return this.contactService.findAll(ctx.tenantId);
 *   }
 */
export const TenantContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.authenticatedUser;
    if (!user) {
      throw new Error(
        'TenantContext decorator used on an unprotected route. ' +
        'Ensure TenantMiddleware is applied.',
      );
    }
    return user;
  },
);
