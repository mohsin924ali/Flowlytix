/**
 * Mock System Index
 * Central export point for all mock services and data
 * Allows frontend to run independently without backend
 */

export * from './data';
export * from './services';
export { MockDataProvider } from './providers/MockDataProvider';
export { configureMocks } from './config/mockConfig';
