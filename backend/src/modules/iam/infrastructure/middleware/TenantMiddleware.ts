import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { TenantContext } from '../../../../shared/infrastructure/TenantContext';

/**
 * ==========================================================================
 * Tenant Context Extraction Middleware
 * ==========================================================================
 *
 * Zero-Trust middleware that:
 *   1. Validates the JWT bearer token (signature + expiration).
 *   2. Extracts the tenant_id claim from the token payload.
 *   3. Validates the tenant_id format against the domain contract.
 *   4. Injects the authenticated context into the request object
 *      for downstream guards and controllers.
 *
 * This middleware runs BEFORE any route handler or guard, ensuring
 * that every request carries a verified tenant context. Database queries
 * downstream MUST use this context to scope data access.
 *
 * Security guarantees:
 *   - Token signature verification prevents tenant_id spoofing.
 *   - Strict claim validation prevents injection via malformed JWTs.
 *   - The tenant context is read-only after extraction.
 * ==========================================================================
 */

export interface AuthenticatedUser {
  readonly userId: string;
  readonly tenantId: string;
  readonly email: string;
  readonly roles: string[];
  readonly permissions: string[];
  readonly attributes: Record<string, string | number | boolean>;
}

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  tenant_id: string;
  email: string;
  roles: string[];
  permissions: string[];
  attributes?: Record<string, string | number | boolean>;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly JWT_SECRET: string;
  private readonly EXPECTED_ISSUER: string;
  private readonly EXPECTED_AUDIENCE: string;
  // UUID v1-v5
  private readonly TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor() {
    this.JWT_SECRET = this.requireEnv('JWT_SECRET');
    this.EXPECTED_ISSUER = this.requireEnv('JWT_ISSUER');
    this.EXPECTED_AUDIENCE = this.requireEnv('JWT_AUDIENCE');
  }

  use(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7);
    if (!token || token.length === 0) {
      throw new UnauthorizedException('Empty bearer token');
    }

    // --- Step 1: Verify JWT Signature and Standard Claims ---
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, this.JWT_SECRET, {
        issuer: this.EXPECTED_ISSUER,
        audience: this.EXPECTED_AUDIENCE,
        algorithms: ['HS256', 'RS256'],
        clockTolerance: 30, // 30-second clock skew tolerance
      }) as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token signature');
      }
      throw new UnauthorizedException('Token verification failed');
    }

    // --- Step 2: Validate Tenant ID Claim ---
    if (!payload.tenant_id || !this.TENANT_ID_PATTERN.test(payload.tenant_id)) {
      throw new UnauthorizedException(
        'Invalid or missing tenant_id claim in token',
      );
    }

    // --- Step 3: Validate Required Claims ---
    if (!payload.sub || !payload.email || !Array.isArray(payload.roles)) {
      throw new UnauthorizedException('Token payload missing required claims');
    }

    // --- Step 4: Construct Immutable Authenticated Context ---
    const authenticatedUser: AuthenticatedUser = Object.freeze({
      userId: payload.sub,
      tenantId: payload.tenant_id,
      email: payload.email,
      roles: Object.freeze([...payload.roles]) as unknown as string[],
      permissions: Object.freeze([...(payload.permissions ?? [])]) as unknown as string[],
      attributes: Object.freeze({ ...(payload.attributes ?? {}) }),
    });

    req.authenticatedUser = authenticatedUser;

    // Bind the tenant to AsyncLocalStorage so the TenantRlsSubscriber
    // injects `app.current_tenant` into every TypeORM transaction
    // started inside this request.
    TenantContext.run(
      {
        tenantId: authenticatedUser.tenantId,
        userId: authenticatedUser.userId,
        roles: [...authenticatedUser.roles],
      },
      () => next(),
    );
  }

  private requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }
}
