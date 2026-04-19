import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicGet, proxyDynamicPost } from '@/lib/apiProxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicGet(`/api/bpms/instances/${id}`, req, 'BPMS');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicPost(`/api/bpms/instances/${id}`, {}, req, 'BPMS');
}
