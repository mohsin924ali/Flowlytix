/**
 * Hooks Index
 * Centralized export for all custom hooks
 * Following Instructions file standards with clean barrel exports
 */

export { useAuth } from './useAuth';
export { useSubscriptions } from './useSubscriptions';
export { useAnalytics } from './useAnalytics';

// Export types for convenience
export type { UseAuthReturn } from './useAuth';
export type { UseSubscriptionsReturn } from './useSubscriptions';
export type { UseAnalyticsReturn } from './useAnalytics';
