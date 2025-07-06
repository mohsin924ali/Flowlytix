/**
 * Mock Configuration
 * Sets up mock electron API to replace real backend calls
 */

import { mockElectronAuthAPI } from '../services/MockAuthService';
import { allMockCustomers } from '../data/customers.mock';
import { allMockProducts } from '../data/products.mock';
import { allMockOrders } from '../data/orders.mock';
import { allMockAgencies } from '../data/agencies.mock';
import { allMockAnalytics } from '../data/analytics.mock';
import { allMockEmployees } from '../data/employees.mock';
import { allMockAreas } from '../data/areas.mock';

// Mock agency data that matches the AgencyService interface
const mockAgencyData = [
  {
    id: 'agency-1',
    name: 'Flowlytix Headquarters',
    databasePath: '/data/agencies/flowlytix-hq.db',
    contactPerson: 'John Admin',
    phone: '+1-555-0100',
    email: 'hq@flowlytix.com',
    address: '123 Business Center, Tech City, TC 12345',
    status: 'active',
    createdAt: '2023-01-01T00:00:00Z',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 30,
      maxCreditLimit: 100000,
      requireApprovalForOrders: false,
      enableInventoryTracking: true,
      taxRate: 0.15,
      currency: 'USD',
      businessHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: true,
      },
    },
  },
  {
    id: 'agency-2',
    name: 'Metro Distribution Hub',
    databasePath: '/data/agencies/metro-dist.db',
    contactPerson: 'Sarah Manager',
    phone: '+1-555-0200',
    email: 'info@metrodist.com',
    address: '456 Distribution Way, Metro City, MC 23456',
    status: 'active',
    createdAt: '2023-03-15T00:00:00Z',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 45,
      maxCreditLimit: 75000,
      requireApprovalForOrders: true,
      enableInventoryTracking: true,
      taxRate: 0.12,
      currency: 'USD',
      businessHours: {
        start: '08:00',
        end: '17:00',
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: true,
        overduePayments: false,
        newOrders: true,
      },
    },
  },
  {
    id: 'agency-3',
    name: 'Regional Sales Network',
    databasePath: '/data/agencies/regional-sales.db',
    contactPerson: 'Mike Sales',
    phone: '+1-555-0300',
    email: 'sales@regionalsales.com',
    address: '789 Commerce Street, Sales City, SC 34567',
    status: 'active',
    createdAt: '2023-06-20T00:00:00Z',
    settings: {
      allowCreditSales: false,
      defaultCreditDays: 0,
      maxCreditLimit: 0,
      requireApprovalForOrders: false,
      enableInventoryTracking: true,
      taxRate: 0.1,
      currency: 'USD',
      businessHours: {
        start: '10:00',
        end: '19:00',
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: false,
        overduePayments: false,
        newOrders: true,
      },
    },
  },
  {
    id: 'agency-4',
    name: 'West Coast Operations',
    databasePath: '/data/agencies/west-coast.db',
    contactPerson: 'Lisa Operations',
    phone: '+1-555-0400',
    email: 'ops@westcoast.com',
    address: '321 Pacific Boulevard, West City, WC 45678',
    status: 'inactive',
    createdAt: '2023-08-10T00:00:00Z',
    settings: {
      allowCreditSales: true,
      defaultCreditDays: 60,
      maxCreditLimit: 50000,
      requireApprovalForOrders: true,
      enableInventoryTracking: false,
      taxRate: 0.08,
      currency: 'USD',
      businessHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'America/Los_Angeles',
      },
      notifications: {
        lowStock: true,
        overduePayments: true,
        newOrders: false,
      },
    },
  },
  {
    id: 'agency-5',
    name: 'Suspended Agency Example',
    databasePath: '/data/agencies/suspended.db',
    contactPerson: 'Test Suspended',
    phone: '+1-555-0500',
    email: 'test@suspended.com',
    address: '999 Suspended Street, Test City, TS 99999',
    status: 'suspended',
    createdAt: '2023-09-01T00:00:00Z',
    settings: {
      allowCreditSales: false,
      defaultCreditDays: 0,
      maxCreditLimit: 0,
      requireApprovalForOrders: true,
      enableInventoryTracking: false,
      taxRate: 0.0,
      currency: 'USD',
      businessHours: {
        start: '00:00',
        end: '00:00',
        timezone: 'America/New_York',
      },
      notifications: {
        lowStock: false,
        overduePayments: false,
        newOrders: false,
      },
    },
  },
];

/**
 * Configure mock electron API
 * This replaces window.electronAPI with mock implementations
 */
export const configureMocks = () => {
  console.log('🎭 Configuring mock electron API...');

  // Create mock electron API object
  const mockElectronAPI = {
    auth: mockElectronAuthAPI,

    agency: {
      createAgency: async (data: any) => {
        console.log('🏢 Mock createAgency called:', data);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          success: true,
          data: {
            agencyId: 'new-agency-' + Date.now(),
            name: data.name,
            databasePath: data.databasePath,
            isOperational: true,
            message: 'Agency created successfully',
          },
        };
      },
      getAgencies: async (params: any) => {
        console.log('🏢 Mock getAgencies called with params:', params);
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Apply filtering if provided
        let filteredAgencies = [...mockAgencyData];

        if (params?.search) {
          const searchTerm = params.search.toLowerCase();
          filteredAgencies = filteredAgencies.filter(
            (agency) =>
              agency.name.toLowerCase().includes(searchTerm) ||
              agency.contactPerson?.toLowerCase().includes(searchTerm) ||
              agency.email?.toLowerCase().includes(searchTerm)
          );
        }

        if (params?.status) {
          filteredAgencies = filteredAgencies.filter((agency) => agency.status === params.status);
        }

        // Apply pagination
        const offset = params?.offset || 0;
        const limit = params?.limit || 50;
        const paginatedAgencies = filteredAgencies.slice(offset, offset + limit);

        console.log('🏢 Mock getAgencies returning:', paginatedAgencies.length, 'agencies');

        return {
          success: true,
          data: {
            agencies: paginatedAgencies,
            total: filteredAgencies.length,
          },
        };
      },
      updateAgency: async (data: any) => {
        console.log('🏢 Mock updateAgency called:', data);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return {
          success: true,
          data: {
            agency: data,
            message: 'Agency updated successfully',
          },
        };
      },
      switchAgency: async (agencyId: string, agencyName: string) => {
        console.log('🏢 Mock switchAgency called:', agencyId, agencyName);
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
          success: true,
          message: `Successfully switched to ${agencyName}`,
        };
      },
    },

    customers: {
      getCustomers: async (filters?: any) => {
        console.log('👥 Mock getCustomers called with filters:', filters);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return allMockCustomers.slice(0, filters?.limit || 20);
      },
      createCustomer: async (customer: any) => {
        console.log('👥 Mock createCustomer called:', customer);
        await new Promise((resolve) => setTimeout(resolve, 600));
        return { success: true, customer: { id: 'new-customer', ...customer } };
      },
      updateCustomer: async (id: string, updates: any) => {
        console.log('👥 Mock updateCustomer called:', id, updates);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true, customer: { id, ...updates } };
      },
      deleteCustomer: async (id: string) => {
        console.log('👥 Mock deleteCustomer called:', id);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { success: true };
      },
    },

    inventory: {
      getProducts: async (filters?: any) => {
        console.log('📦 Mock getProducts called with filters:', filters);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return allMockProducts.slice(0, filters?.limit || 20);
      },
      createProduct: async (product: any) => {
        console.log('📦 Mock createProduct called:', product);
        await new Promise((resolve) => setTimeout(resolve, 600));
        return { success: true, product: { id: 'new-product', ...product } };
      },
      updateProduct: async (id: string, updates: any) => {
        console.log('📦 Mock updateProduct called:', id, updates);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true, product: { id, ...updates } };
      },
      deleteProduct: async (id: string) => {
        console.log('📦 Mock deleteProduct called:', id);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { success: true };
      },
    },

    orders: {
      getOrders: async (filters?: any) => {
        console.log('📋 Mock getOrders called with filters:', filters);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return allMockOrders.slice(0, filters?.limit || 20);
      },
      createOrder: async (order: any) => {
        console.log('📋 Mock createOrder called:', order);
        await new Promise((resolve) => setTimeout(resolve, 700));
        return { success: true, order: { id: 'new-order', ...order } };
      },
      updateOrder: async (id: string, updates: any) => {
        console.log('📋 Mock updateOrder called:', id, updates);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true, order: { id, ...updates } };
      },
      cancelOrder: async (id: string, reason: string) => {
        console.log('📋 Mock cancelOrder called:', id, reason);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { success: true };
      },
    },

    analytics: {
      salesSummary: async (params: any) => {
        console.log('📊 Mock salesSummary called:', params);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return allMockAnalytics.salesSummary;
      },
      salesTrends: async (params: any) => {
        console.log('📊 Mock salesTrends called:', params);
        await new Promise((resolve) => setTimeout(resolve, 600));
        return { trends: [] };
      },
      customerSegmentation: async (params: any) => {
        console.log('📊 Mock customerSegmentation called:', params);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return allMockAnalytics.customerSegmentation;
      },
      productPerformance: async (params: any) => {
        console.log('📊 Mock productPerformance called:', params);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return allMockAnalytics.topProducts;
      },
      revenueForecast: async (params: any) => {
        console.log('📊 Mock revenueForecast called:', params);
        await new Promise((resolve) => setTimeout(resolve, 700));
        return { forecast: [] };
      },
      marketBasket: async (params: any) => {
        console.log('📊 Mock marketBasket called:', params);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { analysis: [] };
      },
      customerLTV: async (params: any) => {
        console.log('📊 Mock customerLTV called:', params);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { ltv: [] };
      },
      territoryPerformance: async (params: any) => {
        console.log('📊 Mock territoryPerformance called:', params);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { performance: [] };
      },
    },

    lotBatch: {
      getLotBatches: async (filters?: any) => {
        console.log('📦 Mock getLotBatches called:', filters);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return [];
      },
      createLotBatch: async (lotBatch: any) => {
        console.log('📦 Mock createLotBatch called:', lotBatch);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { success: true, lotBatch: { id: 'new-lot-batch', ...lotBatch } };
      },
      updateLotBatch: async (id: string, updates: any) => {
        console.log('📦 Mock updateLotBatch called:', id, updates);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { success: true, lotBatch: { id, ...updates } };
      },
    },

    database: {
      query: async (sql: string, params?: unknown[]) => {
        console.log('💾 Mock database query called:', sql);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return [];
      },
      execute: async (sql: string, params?: unknown[]) => {
        console.log('💾 Mock database execute called:', sql);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { changes: 1, lastInsertRowid: Math.floor(Math.random() * 1000) };
      },
      transaction: async (operations: any[]) => {
        console.log('💾 Mock database transaction called with', operations.length, 'operations');
        await new Promise((resolve) => setTimeout(resolve, 500));
        return [];
      },
    },
  };

  // Handle both browser and Electron environments
  if (!(window as any).electronAPI) {
    // Browser mode - replace entire electronAPI with mock
    (window as any).electronAPI = mockElectronAPI;
    console.log('✅ Mock electron API configured successfully (browser mode)');
    console.log('🎭 Available mock APIs:', Object.keys(mockElectronAPI));
  } else {
    // Electron mode - create a proxy wrapper since both the object and its properties are read-only
    console.log('🔌 Real Electron API detected - creating proxy wrapper');
    console.log('🔌 Existing APIs:', Object.keys((window as any).electronAPI));

    const originalElectronAPI = (window as any).electronAPI;

    // Create a proxy that intercepts property access
    const proxyElectronAPI = new Proxy(originalElectronAPI, {
      get(target, prop) {
        // If the property exists on the original API, return it
        if (prop in target) {
          return target[prop];
        }

        // If the property exists in our mock API, return it
        if (prop in mockElectronAPI) {
          console.log(`🔀 Proxy: Routing ${String(prop)} to mock API`);
          return (mockElectronAPI as any)[prop];
        }

        // Property doesn't exist in either
        console.log(`❌ Proxy: Property ${String(prop)} not found in either API`);
        return undefined;
      },

      has(target, prop) {
        // Check if property exists in either original or mock API
        return prop in target || prop in mockElectronAPI;
      },

      ownKeys(target) {
        // Return all keys from both original and mock APIs
        const originalKeys = Object.keys(target);
        const mockKeys = Object.keys(mockElectronAPI);
        const allKeys = [...new Set([...originalKeys, ...mockKeys])];
        console.log('🔀 Proxy: Available keys:', allKeys);
        return allKeys;
      },

      getOwnPropertyDescriptor(target, prop) {
        // Return descriptor for properties from either API
        if (prop in target) {
          return Object.getOwnPropertyDescriptor(target, prop);
        }
        if (prop in mockElectronAPI) {
          return Object.getOwnPropertyDescriptor(mockElectronAPI as any, prop);
        }
        return undefined;
      },
    });

    // Try to replace the electronAPI with our proxy
    try {
      // Use Object.defineProperty to override the read-only property
      Object.defineProperty(window, 'electronAPI', {
        value: proxyElectronAPI,
        writable: true,
        configurable: true,
        enumerable: true,
      });
      console.log('✅ Successfully replaced electronAPI with proxy wrapper');
    } catch (error) {
      console.warn('⚠️ Could not replace electronAPI, using fallback approach');
      console.warn('⚠️ Error:', error);

      // Fallback: Create a global variable that services can use
      (window as any).__mockElectronAPI = mockElectronAPI;
      console.log('✅ Created fallback __mockElectronAPI');
    }

    console.log('🔌 Final available APIs:', Object.keys((window as any).electronAPI));
    console.log('🔌 Auth API available:', !!(window as any).electronAPI.auth);
    console.log('🔌 Direct auth check:', (window as any).electronAPI.auth);
    console.log('🔌 Proxy auth check:', proxyElectronAPI.auth);
    console.log('🔌 Mock auth check:', mockElectronAPI.auth);
  }

  return mockElectronAPI;
};
