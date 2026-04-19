import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

function backendHeaders(req: NextRequest): Record<string, string> {
  const token = req.cookies.get('suple_token')?.value;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string; furnitureId: string }> },
): Promise<NextResponse> {
  const { orderId, furnitureId } = await params;
  const res = await fetch(
    `${BACKEND_URL}/api/erp/furniture/apply-to-order/${orderId}/${furnitureId}`,
    { method: 'POST', headers: backendHeaders(req) },
  );
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
