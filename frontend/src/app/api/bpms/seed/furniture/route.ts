import { proxyPost } from '@/lib/apiProxy';

export const POST = proxyPost('/api/bpms/seed/furniture', { tag: 'BPMS_SEED' });
