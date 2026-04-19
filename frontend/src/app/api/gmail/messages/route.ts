import { proxyGet } from '@/lib/apiProxy';

export const GET = proxyGet('/api/gmail/messages', { tag: 'Gmail/messages' });
