import { proxyGet } from '@/lib/apiProxy';

export const GET = proxyGet('/api/gmail/sent', { tag: 'Gmail/sent' });
