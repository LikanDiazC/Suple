import { NextRequest, NextResponse } from 'next/server';
import { proxyDynamicDelete } from '@/lib/apiProxy';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
): Promise<NextResponse> {
  const { id, itemId } = await params;
  return proxyDynamicDelete(`/api/erp/orders/${id}/items/${itemId}`, req, 'ERP/orders');
}
