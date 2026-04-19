import { proxyGet, proxyPost } from '@/lib/apiProxy';

export const GET  = proxyGet('/api/marketing/forms',  { tag: 'Marketing/forms' });
export const POST = proxyPost('/api/marketing/forms', { successStatus: 201, tag: 'Marketing/forms' });
