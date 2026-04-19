import { proxyGet } from '@/lib/apiProxy';

export const GET = proxyGet('/api/bpms/analytics/summary', { tag: 'BPMS' });
