import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('suple_token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });
  return response;
}
