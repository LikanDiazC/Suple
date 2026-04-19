import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicPost } from '@/lib/apiProxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return proxyDynamicPost(`/api/bpms/tasks/${id}/comment`, body, req, 'BPMS');
}
