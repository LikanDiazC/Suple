import { proxyGet, proxyPost } from '@/lib/apiProxy';

export const GET  = proxyGet('/api/scm/work-orders', { tag: 'SCM' });
export const POST = proxyPost('/api/scm/work-orders', { successStatus: 201, tag: 'SCM' });
