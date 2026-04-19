import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicGet } from '@/lib/apiProxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicGet(`/api/scm/work-orders/${id}`, req, 'SCM');
}
