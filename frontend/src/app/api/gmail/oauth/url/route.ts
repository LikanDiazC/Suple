import { proxyGet } from '@/lib/apiProxy';

export const GET = proxyGet('/api/gmail/oauth/url', { tag: 'Gmail/oauth/url' });
