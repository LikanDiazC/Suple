import { NextResponse } from 'next/server';

export async function GET() {
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

  try {
    const response = await fetch(`${backendUrl}/api/scm/health`, {
      headers: { 'x-tenant-id': 'tnt_demo01' },
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });

    if (response.ok) {
      return NextResponse.json({ status: 'online' });
    }
    return NextResponse.json({ status: 'offline' });
  } catch {
    // Backend not reachable
    return NextResponse.json({ status: 'offline' });
  }
}
