import { NextRequest, NextResponse } from 'next/server';

interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  fullName?: string;
  roles?: string[];
  exp?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as JwtPayload;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get('suple_token')?.value;
  if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const payload = decodeJwt(token);
  if (!payload) return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return NextResponse.json({ error: 'expired' }, { status: 401 });
  }

  return NextResponse.json({
    id: payload.userId,
    email: payload.email,
    fullName: payload.fullName ?? payload.email,
    tenantId: payload.tenantId,
    roles: payload.roles ?? [],
  });
}
