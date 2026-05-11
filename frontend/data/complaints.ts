// Re-export unified constants (single source of truth)
export {
  statusConfig,
  getCategoryLabel,
  categoryLabels,
  STATUS_OPTIONS,
  getComplaintIdDisplay,
  CATEGORIES,
} from '@/lib/complaints';

import { categoryOptions } from '@/lib/categories';

// Urgency labels
export const urgencyLabels: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};
