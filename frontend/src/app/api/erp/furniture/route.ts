import { proxyGet, proxyPost } from '@/lib/apiProxy';

export const GET  = proxyGet('/api/erp/furniture', { tag: 'ERP/furniture' });
export const POST = proxyPost('/api/erp/furniture', { successStatus: 201, tag: 'ERP/furniture' });
