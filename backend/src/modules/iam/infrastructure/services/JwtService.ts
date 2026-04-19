import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface IssueTokenInput {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly ttlSeconds: number;

  constructor() {
    this.secret = this.requireEnv('JWT_SECRET');
    this.issuer = this.requireEnv('JWT_ISSUER');
    this.audience = this.requireEnv('JWT_AUDIENCE');
    this.ttlSeconds = Number(process.env.JWT_TTL_SECONDS ?? 60 * 60 * 8); // 8h
  }

  issue(input: IssueTokenInput): { token: string; expiresAt: Date } {
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const token = jwt.sign(
      {
        sub: input.userId,
        tenant_id: input.tenantId,
        email: input.email,
        roles: input.roles,
        permissions: input.permissions,
      },
      this.secret,
      {
        algorithm: 'HS256',
        issuer: this.issuer,
        audience: this.audience,
        expiresIn: this.ttlSeconds,
      },
    );
    return { token, expiresAt };
  }

  private requireEnv(key: string): string {
    const v = process.env[key];
    if (!v) throw new Error(`Required env var ${key} is not set`);
    return v;
  }
}
