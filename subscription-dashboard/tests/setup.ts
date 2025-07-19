/**
 * Jest Test Setup
 * Global test configuration and setup for the Flowlytix Subscription Dashboard
 * Following Instructions file standards with comprehensive testing setup
 */

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { server } from './utils/server';

// Global TextEncoder/TextDecoder setup for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock window.matchMedia for Material-UI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.ResizeObserver for chart components
(global as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver for scroll-based components
(global as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
(global as any).localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
(global as any).sessionStorage = sessionStorageMock;

// Mock fetch for API calls
(global as any).fetch = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
process.env.NEXT_PUBLIC_APP_NAME = 'Flowlytix Dashboard';

// Setup MSW server
beforeAll(() => {
  // Start the server before all tests
  server.listen({
    onUnhandledRequest: 'error',
  });
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();

  // Reset MSW handlers
  server.resetHandlers();
});

// Close MSW server after all tests
afterAll(() => {
  server.close();
});

// Global test utilities
(global as any).testUtils = {
  // Utility to wait for async operations
  waitFor: async (callback: () => void | Promise<void>, timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        await callback();
        return;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error(`Timeout after ${timeout}ms`);
  },

  // Utility to create mock promises
  createMockPromise: <T>(value: T, shouldReject = false, delay = 0): Promise<T> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (shouldReject) {
          reject(new Error('Mock error'));
        } else {
          resolve(value);
        }
      }, delay);
    });
  },
};

// Suppress specific warnings during tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('componentWillReceiveProps') ||
      args[0].includes('componentWillUpdate') ||
      args[0].includes('React.createElement: type is invalid'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};
