import { proxyPost } from '@/lib/apiProxy';

export const POST = proxyPost('/api/gmail/sync-contacts', { successStatus: 200, tag: 'Gmail/sync-contacts' });
