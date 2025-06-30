/**
 * Analytics Mock Data
 */

export interface MockAnalytics {
  salesSummary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    growth: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    revenue: number;
    quantity: number;
  }>;
  customerSegmentation: Array<{
    segment: string;
    count: number;
    percentage: number;
  }>;
}

export const mockAnalytics: MockAnalytics = {
  salesSummary: {
    totalRevenue: 125000,
    totalOrders: 350,
    averageOrderValue: 357.14,
    growth: 15.3,
  },
  topProducts: [
    { productId: 'prod-1', name: 'Premium Wireless Headphones', revenue: 35000, quantity: 120 },
    { productId: 'prod-2', name: 'Ergonomic Office Chair', revenue: 28000, quantity: 65 },
    { productId: 'prod-3', name: 'Business Strategy Handbook', revenue: 15000, quantity: 450 },
  ],
  customerSegmentation: [
    { segment: 'CORPORATE', count: 45, percentage: 35 },
    { segment: 'RETAIL', count: 38, percentage: 30 },
    { segment: 'WHOLESALE', count: 25, percentage: 20 },
    { segment: 'DISTRIBUTOR', count: 19, percentage: 15 },
  ],
};

export const allMockAnalytics = mockAnalytics;
