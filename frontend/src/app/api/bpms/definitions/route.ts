import { proxyGet, proxyPost } from '@/lib/apiProxy';

export const GET = proxyGet('/api/bpms/definitions', { tag: 'BPMS' });
export const POST = proxyPost('/api/bpms/definitions', { successStatus: 201, tag: 'BPMS' });
