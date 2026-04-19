import { proxyGet } from '@/lib/apiProxy';

export const GET = proxyGet('/api/iam/users', { tag: 'IAM' });
