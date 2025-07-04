/**
 * Analytics Mock Data
 * Comprehensive mock data for dashboard analytics
 * Following Instructions file standards with SCREAMING_SNAKE_CASE for constants
 */

// Analytics Constants
export const ANALYTICS_REFRESH_INTERVAL = 30000;
export const DEFAULT_CURRENCY = 'USD';
export const MAX_CHART_POINTS = 30;

// Sales Data Interface
export interface SalesDataPoint {
  date: string;
  sales: number;
  orders: number;
  customers: number;
}

// Payment Method Interface
export interface PaymentMethodData {
  method: string;
  count: number;
  value: number;
  percentage: number;
}

// Regional Performance Interface
export interface RegionalData {
  region: string;
  sales: number;
  percentage: number;
  growth: number;
  customers: number;
}

// Top Performer Interface
export interface TopPerformer {
  id: string;
  name: string;
  value: number;
  percentage: number;
  change: number;
}

// Customer Segment Interface
export interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  averageValue: number;
}

// Comprehensive Analytics Interface
export interface MockAnalytics {
  salesSummary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    growth: number;
    uniqueCustomers: number;
    growthRate: number;
  };
  timeSeries: SalesDataPoint[];
  paymentMethods: PaymentMethodData[];
  salesByRegion: RegionalData[];
  topProducts: TopPerformer[];
  topCustomers: TopPerformer[];
  customerSegmentation: CustomerSegment[];
  inventorySummary: {
    totalProducts: number;
    activeProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalStockValue: number;
    averageSellingPrice: number;
  };
  recentActivities: Array<{
    id: string;
    type: 'ORDER' | 'CUSTOMER' | 'PRODUCT' | 'PAYMENT' | 'SHIPMENT';
    title: string;
    description: string;
    timestamp: string;
    user: string;
    status: 'SUCCESS' | 'PENDING' | 'ERROR';
  }>;
}

// Mock Sales Time Series Data
const MOCK_TIME_SERIES: SalesDataPoint[] = [
  { date: '2024-01-15', sales: 15420, orders: 45, customers: 32 },
  { date: '2024-01-16', sales: 18350, orders: 52, customers: 38 },
  { date: '2024-01-17', sales: 22100, orders: 61, customers: 45 },
  { date: '2024-01-18', sales: 19800, orders: 58, customers: 41 },
  { date: '2024-01-19', sales: 25600, orders: 68, customers: 52 },
  { date: '2024-01-20', sales: 21900, orders: 63, customers: 48 },
  { date: '2024-01-21', sales: 28400, orders: 75, customers: 58 },
];

// Mock Payment Methods Data
const MOCK_PAYMENT_METHODS: PaymentMethodData[] = [
  { method: 'Credit Card', count: 185, value: 58200, percentage: 44.2 },
  { method: 'Bank Transfer', count: 142, value: 45300, percentage: 34.4 },
  { method: 'Cash', count: 95, value: 28070, percentage: 21.4 },
];

// Mock Regional Performance Data
const MOCK_REGIONAL_DATA: RegionalData[] = [
  { region: 'California', sales: 52600, percentage: 40.0, growth: 18.2, customers: 245 },
  { region: 'Texas', sales: 34200, percentage: 26.0, growth: 12.4, customers: 186 },
  { region: 'New York', sales: 28400, percentage: 21.6, growth: -5.2, customers: 142 },
  { region: 'Florida', sales: 16370, percentage: 12.4, growth: 25.1, customers: 98 },
];

// Mock Top Products Data
const MOCK_TOP_PRODUCTS: TopPerformer[] = [
  { id: 'prod-1', name: 'Premium Organic Almonds', value: 18500, percentage: 14.1, change: 8.2 },
  { id: 'prod-2', name: 'Artisan Coffee Beans', value: 15200, percentage: 11.6, change: 15.3 },
  { id: 'prod-3', name: 'Organic Quinoa', value: 12800, percentage: 9.7, change: -2.1 },
  { id: 'prod-4', name: 'Natural Honey', value: 11400, percentage: 8.7, change: 22.5 },
  { id: 'prod-5', name: 'Coconut Oil', value: 9600, percentage: 7.3, change: 5.8 },
];

// Mock Top Customers Data
const MOCK_TOP_CUSTOMERS: TopPerformer[] = [
  { id: 'cust-1', name: 'Metro Supermarket', value: 28500, percentage: 21.7, change: 18.2 },
  { id: 'cust-2', name: 'TechCorp Industries', value: 22100, percentage: 16.8, change: 12.4 },
  { id: 'cust-3', name: 'Fresh Foods Market', value: 18900, percentage: 14.4, change: -5.2 },
  { id: 'cust-4', name: 'Golden Gate Grocers', value: 15600, percentage: 11.9, change: 25.1 },
  { id: 'cust-5', name: 'Sunset Retail Chain', value: 13200, percentage: 10.0, change: 8.7 },
];

// Mock Customer Segmentation Data
const MOCK_CUSTOMER_SEGMENTS: CustomerSegment[] = [
  { segment: 'Premium', count: 125, percentage: 10.0, averageValue: 8500 },
  { segment: 'Standard', count: 748, percentage: 60.0, averageValue: 2100 },
  { segment: 'Basic', count: 324, percentage: 26.0, averageValue: 950 },
  { segment: 'Enterprise', count: 50, percentage: 4.0, averageValue: 15600 },
];

// Mock Recent Activities Data
const MOCK_RECENT_ACTIVITIES = [
  {
    id: 'act-1',
    type: 'ORDER' as const,
    title: 'New Order #ORD-2024-001',
    description: 'Premium Organic Almonds - $450.00',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    user: 'John Smith',
    status: 'SUCCESS' as const,
  },
  {
    id: 'act-2',
    type: 'CUSTOMER' as const,
    title: 'New Customer Added',
    description: 'Metro Supermarket - Premium Tier',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    user: 'Sarah Johnson',
    status: 'SUCCESS' as const,
  },
  {
    id: 'act-3',
    type: 'SHIPMENT' as const,
    title: 'Shipment Delivered',
    description: 'Order #ORD-2024-045 - Golden Gate Grocers',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    user: 'Mike Wilson',
    status: 'SUCCESS' as const,
  },
  {
    id: 'act-4',
    type: 'PAYMENT' as const,
    title: 'Payment Received',
    description: 'Invoice #INV-2024-089 - $1,250.00',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    user: 'Lisa Davis',
    status: 'SUCCESS' as const,
  },
  {
    id: 'act-5',
    type: 'PRODUCT' as const,
    title: 'Low Stock Alert',
    description: 'Artisan Coffee Beans - 15 units remaining',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    user: 'System',
    status: 'PENDING' as const,
  },
];

// Main Mock Analytics Data
export const mockAnalytics: MockAnalytics = {
  salesSummary: {
    totalRevenue: 131570,
    totalOrders: 422,
    averageOrderValue: 311.71,
    growth: 15.3,
    uniqueCustomers: 314,
    growthRate: 12.5,
  },
  timeSeries: MOCK_TIME_SERIES,
  paymentMethods: MOCK_PAYMENT_METHODS,
  salesByRegion: MOCK_REGIONAL_DATA,
  topProducts: MOCK_TOP_PRODUCTS,
  topCustomers: MOCK_TOP_CUSTOMERS,
  customerSegmentation: MOCK_CUSTOMER_SEGMENTS,
  inventorySummary: {
    totalProducts: 1247,
    activeProducts: 1085,
    lowStockProducts: 42,
    outOfStockProducts: 8,
    totalStockValue: 485600,
    averageSellingPrice: 24.85,
  },
  recentActivities: MOCK_RECENT_ACTIVITIES,
};

// Enhanced Analytics Data with Real-time Updates
export const generateRealTimeAnalytics = (): MockAnalytics => {
  const baseAnalytics = { ...mockAnalytics };

  // Add some random variation to simulate real-time updates
  const variation = (base: number, percentage: number = 0.1) => {
    const change = (Math.random() - 0.5) * 2 * percentage;
    return Math.round(base * (1 + change));
  };

  // Update sales summary with small variations
  baseAnalytics.salesSummary = {
    ...baseAnalytics.salesSummary,
    totalRevenue: variation(131570, 0.05),
    totalOrders: variation(422, 0.08),
    uniqueCustomers: variation(314, 0.03),
  };

  // Update recent activities with current timestamps
  baseAnalytics.recentActivities = MOCK_RECENT_ACTIVITIES.map((activity, index) => ({
    ...activity,
    timestamp: new Date(Date.now() - (index + 1) * 15 * 60 * 1000).toISOString(),
  }));

  return baseAnalytics;
};

// Utility Functions
export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Export all analytics data
export const allMockAnalytics = mockAnalytics;

// Additional Analytics Constants
export const ANALYTICS_COLORS = {
  PRIMARY: '#513ff2',
  SUCCESS: '#4caf50',
  WARNING: '#ff9800',
  ERROR: '#f44336',
  INFO: '#2196f3',
} as const;

export const CHART_ANIMATION_DURATION = 750;
export const REFRESH_BUTTON_COOLDOWN = 2000;
