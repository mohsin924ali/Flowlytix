/**
 * Test setup file for Jest
 * Configures testing environment for React components and DOM testing
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  // Increase timeout for queries
  asyncUtilTimeout: 5000,
});

// Mock Electron APIs for testing
const mockElectronAPI = {
  getAppVersion: jest.fn(() => Promise.resolve('1.0.0')),
  getSystemInfo: jest.fn(() => Promise.resolve({
    platform: 'test',
    arch: 'x64',
    version: '1.0.0',
    totalMemory: 8192,
    freeMemory: 4096,
  })),
  minimizeWindow: jest.fn(),
  maximizeWindow: jest.fn(),
  closeWindow: jest.fn(),
  selectFile: jest.fn(() => Promise.resolve(null)),
  selectDirectory: jest.fn(() => Promise.resolve(null)),
  saveFile: jest.fn(() => Promise.resolve(null)),
  database: {
    query: jest.fn(() => Promise.resolve([])),
    execute: jest.fn(() => Promise.resolve({ changes: 0, lastInsertRowid: 0 })),
    transaction: jest.fn(() => Promise.resolve([])),
  },
  inventory: {
    getProducts: jest.fn(() => Promise.resolve([])),
    createProduct: jest.fn(() => Promise.resolve({})),
    updateProduct: jest.fn(() => Promise.resolve({})),
    deleteProduct: jest.fn(() => Promise.resolve()),
  },
  orders: {
    getOrders: jest.fn(() => Promise.resolve([])),
    createOrder: jest.fn(() => Promise.resolve({})),
    updateOrder: jest.fn(() => Promise.resolve({})),
    cancelOrder: jest.fn(() => Promise.resolve()),
  },
  customers: {
    getCustomers: jest.fn(() => Promise.resolve([])),
    createCustomer: jest.fn(() => Promise.resolve({})),
    updateCustomer: jest.fn(() => Promise.resolve({})),
    deleteCustomer: jest.fn(() => Promise.resolve()),
  },
  reports: {
    generateSalesReport: jest.fn(() => Promise.resolve({})),
    generateInventoryReport: jest.fn(() => Promise.resolve({})),
    exportReport: jest.fn(() => Promise.resolve('')),
  },
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  showNotification: jest.fn(),
  showErrorDialog: jest.fn(),
  showConfirmDialog: jest.fn(() => Promise.resolve(true)),
};

// Mock window.electronAPI for testing
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true,
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url'),
  writable: true,
});

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
  writable: true,
});

// Suppress console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  mockElectronAPI,
  // Add more global test utilities as needed
};

export { mockElectronAPI }; 