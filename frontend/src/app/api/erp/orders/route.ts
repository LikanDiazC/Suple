import { proxyGet, proxyPost } from '@/lib/apiProxy';

export const GET  = proxyGet('/api/erp/orders', { tag: 'ERP/orders' });
export const POST = proxyPost('/api/erp/orders', { successStatus: 201, tag: 'ERP/orders' });
