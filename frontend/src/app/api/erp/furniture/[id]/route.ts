import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicGet, proxyDynamicDelete } from '@/lib/apiProxy';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

function backendHeaders(req: NextRequest): Record<string, string> {
  const token = req.cookies.get('suple_token')?.value;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicGet(`/api/erp/furniture/${id}`, req, 'ERP/furniture');
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${BACKEND_URL}/api/erp/furniture/${id}`, {
    method: 'PUT',
    headers: backendHeaders(req),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicDelete(`/api/erp/furniture/${id}`, req, 'ERP/furniture');
}
