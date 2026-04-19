import { proxyGet, proxyPost } from '@/lib/apiProxy';

export const GET  = proxyGet('/api/marketing/campaigns',  { tag: 'Marketing/campaigns' });
export const POST = proxyPost('/api/marketing/campaigns', { successStatus: 201, tag: 'Marketing/campaigns' });
