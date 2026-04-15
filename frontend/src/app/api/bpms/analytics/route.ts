import { proxyGet } from '@/lib/apiProxy';
import type { BpmsAnalytics } from '@/types/bpms';

const MOCK_ANALYTICS: BpmsAnalytics = {
  activeInstances: 5,
  pendingTasks: 12,
  overdueTasks: 2,
  completedToday: 3,
};

export const GET = proxyGet('/api/bpms/analytics/summary', MOCK_ANALYTICS, { tag: 'BPMS' });
