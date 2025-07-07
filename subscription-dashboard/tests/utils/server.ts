/**
 * MSW Server Configuration
 * Mock Service Worker setup for API mocking during tests
 * Following Instructions file standards with comprehensive API mocking
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup MSW server with request handlers
export const server = setupServer(...handlers);

// Export for use in tests
export { handlers } from './handlers';
