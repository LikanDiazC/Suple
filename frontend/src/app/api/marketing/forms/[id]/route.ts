import { NextRequest, NextResponse } from 'next/server';
import {
  BACKEND_URL,
  backendHeaders,
  proxyDynamicGet,
  proxyDynamicDelete,
} from '@/lib/apiProxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicGet(`/api/marketing/forms/${id}`, req, 'Marketing/forms');
}

export async function DELETE(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicDelete(`/api/marketing/forms/${id}`, req, 'Marketing/forms');
}
