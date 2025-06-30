/**
 * Mock Configuration
 * Sets up mock electron API to replace real backend calls
 */

import { mockElectronAuthAPI } from '../services/MockAuthService';
import { allMockCustomers } from '../data/customers.mock';
import { allMockProducts } from '../data/products.mock';
import { allMockOrders } from '../data/orders.mock';
import { allMockAgencies } from '../data/agencies.mock';
import { allMockShipments } from '../data/shipping.mock';
import { allMockAnalytics } from '../data/analytics.mock';
import { allMockEmployees } from '../data/employees.mock';
import { allMockAreas } from '../data/areas.mock';

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
        return { success: true, agency: { id: 'new-agency', ...data } };
      },
      getAgencies: async () => {
        console.log('🏢 Mock getAgencies called');
        await new Promise((resolve) => setTimeout(resolve, 300));
        return allMockAgencies;
      },
      updateAgency: async (data: any) => {
        console.log('🏢 Mock updateAgency called:', data);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { success: true, agency: data };
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

    shipping: {
      getShipments: async (filters?: any) => {
        console.log('🚚 Mock getShipments called with filters:', filters);
        await new Promise((resolve) => setTimeout(resolve, 400));
        return allMockShipments;
      },
      createShipment: async (shipment: any) => {
        console.log('🚚 Mock createShipment called:', shipment);
        await new Promise((resolve) => setTimeout(resolve, 600));
        return { success: true, shipment: { id: 'new-shipment', ...shipment } };
      },
      trackShipment: async (trackingNumber: string) => {
        console.log('🚚 Mock trackShipment called:', trackingNumber);
        await new Promise((resolve) => setTimeout(resolve, 300));
        const shipment = allMockShipments.find((s) => s.trackingNumber === trackingNumber);
        return shipment || null;
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

  // Replace window.electronAPI with mock
  (window as any).electronAPI = mockElectronAPI;

  console.log('✅ Mock electron API configured successfully');
  console.log('🎭 Available mock APIs:', Object.keys(mockElectronAPI));

  return mockElectronAPI;
};
