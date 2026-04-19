import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../middleware/TenantMiddleware';

/**
 * Verifies that TenantMiddleware has already validated the JWT and
 * attached an AuthenticatedUser to the request. Use this on any
 * controller or route that requires an authenticated session.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.authenticatedUser;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}
