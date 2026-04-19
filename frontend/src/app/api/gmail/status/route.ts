import { proxyGet } from '@/lib/apiProxy';

export const GET = proxyGet('/api/gmail/status', { tag: 'Gmail/status' });
