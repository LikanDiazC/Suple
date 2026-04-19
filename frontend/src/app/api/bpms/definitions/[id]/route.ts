import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicGet, proxyDynamicPut } from '@/lib/apiProxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicGet(`/api/bpms/definitions/${id}`, req, 'BPMS');
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  return proxyDynamicPut(`/api/bpms/definitions/${id}`, body, req, 'BPMS');
}
