import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicGet } from '@/lib/apiProxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  const qs = req.nextUrl.searchParams.toString();
  const path = `/api/marketing/forms/${id}/responses${qs ? `?${qs}` : ''}`;
  return proxyDynamicGet(path, req, 'Marketing/forms/responses');
}
