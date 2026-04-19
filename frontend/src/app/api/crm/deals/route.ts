import { proxyGet } from '@/lib/apiProxy';

export const GET = proxyGet('/api/crm/deals', { tag: 'CRM/deals' });
