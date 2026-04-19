import { proxyGet } from '@/lib/apiProxy';

export const GET = proxyGet('/api/bpms/tasks', { tag: 'BPMS' });
