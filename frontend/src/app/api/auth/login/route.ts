import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

interface LoginResponse {
  token: string;
  expiresAt: string;
  mustChangePassword: boolean;
  user: { id: string; email: string; fullName: string; tenantId: string; roles: string[] };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: text || 'Invalid credentials' }, { status: res.status });
  }

  const data = (await res.json()) as LoginResponse;
  const expiresAt = new Date(data.expiresAt);
  const response = NextResponse.json({
    mustChangePassword: data.mustChangePassword,
    user: data.user,
  });

  response.cookies.set('suple_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return response;
}
