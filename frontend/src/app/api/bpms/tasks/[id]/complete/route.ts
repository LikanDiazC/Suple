import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicPost } from '@/lib/apiProxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = await req.json();
  return proxyDynamicPost(
    `/api/bpms/tasks/${id}/complete`,
    body,
    { success: true, outcome: body.outcome ?? null },
    'BPMS',
    req,
  );
}
