import { proxyPost } from '@/lib/apiProxy';

export const POST = proxyPost('/api/gmail/send', { tag: 'Gmail/send' });
