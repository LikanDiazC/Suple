import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicPost } from '@/lib/apiProxy';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicPost(
    `/api/bpms/definitions/${id}/publish`,
    {},
    { success: true },
    'BPMS',
    _req,
  );
}
