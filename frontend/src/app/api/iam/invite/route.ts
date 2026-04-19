import { proxyPost } from '@/lib/apiProxy';

export const POST = proxyPost('/auth/invite', { successStatus: 201, tag: 'IAM' });
