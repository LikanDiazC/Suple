import { NextRequest } from 'next/server';
import { proxyDynamicDelete } from '@/lib/apiProxy';

export async function DELETE(req: NextRequest) {
  return proxyDynamicDelete('/api/gmail/disconnect', req, 'Gmail/disconnect');
}
