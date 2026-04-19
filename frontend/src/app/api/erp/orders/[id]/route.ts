import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicGet, proxyDynamicDelete } from '@/lib/apiProxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicGet(`/api/erp/orders/${id}`, req, 'ERP/orders');
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyDynamicDelete(`/api/erp/orders/${id}`, req, 'ERP/orders');
}
