import { proxyGet, proxyPost } from '@/lib/apiProxy';

export const GET = proxyGet('/api/bpms/instances', { tag: 'BPMS' });
export const POST = proxyPost('/api/bpms/instances', { successStatus: 201, tag: 'BPMS' });
