/**
 * Analytics Hook - Simplified Approach
 *
 * Simple React hook for analytics with mock data.
 * Covers sales, customer, and product analytics.
 * Ready for Python FastAPI + PostgreSQL backend integration.
 */

import { useState, useEffect, useMemo } from 'react';

// Analytics Types
export interface SalesDataPoint {
  date: string;
  sales: number;
  orders: number;
  customers: number;
}

export interface TopPerformer {
  id: string;
  name: string;
  value: number;
  percentage: number;
  change: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  value: number;
  percentage: number;
}

export interface SalesAnalytics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  uniqueCustomers: number;
  growthRate: number;
  timeSeries: SalesDataPoint[];
  topProducts: TopPerformer[];
  topCustomers: TopPerformer[];
  paymentMethods: PaymentMethodBreakdown[];
  salesByRegion: Array<{ region: string; sales: number; percentage: number }>;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  churnRate: number;
  averageLifetimeValue: number;
  customerSegments: Array<{
    segment: string;
    count: number;
    percentage: number;
    averageValue: number;
  }>;
  retentionRates: Array<{
    month: string;
    rate: number;
  }>;
  topCustomersByValue: TopPerformer[];
  customersByRegion: Array<{
    region: string;
    customers: number;
    percentage: number;
  }>;
}

export interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  topProductsBySales: TopPerformer[];
  topProductsByMargin: TopPerformer[];
  categoryPerformance: Array<{
    category: string;
    sales: number;
    margin: number;
    products: number;
  }>;
  inventoryTurnover: Array<{
    product: string;
    turnoverRate: number;
    daysToSell: number;
  }>;
  priceAnalysis: Array<{
    priceRange: string;
    products: number;
    sales: number;
  }>;
}

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  agencyId?: string;
  region?: string;
  category?: string;
}

// Mock Data
const MOCK_SALES_DATA: SalesDataPoint[] = [
  { date: '2024-01-01', sales: 15420, orders: 45, customers: 32 },
  { date: '2024-01-02', sales: 18350, orders: 52, customers: 38 },
  { date: '2024-01-03', sales: 22100, orders: 61, customers: 45 },
  { date: '2024-01-04', sales: 19800, orders: 58, customers: 41 },
  { date: '2024-01-05', sales: 25600, orders: 68, customers: 52 },
  { date: '2024-01-06', sales: 21900, orders: 63, customers: 48 },
  { date: '2024-01-07', sales: 28400, orders: 75, customers: 58 },
];

// Custom Hooks
export const useSalesAnalytics = (agencyId: string, filters: AnalyticsFilters = {}) => {
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        const mockAnalytics: SalesAnalytics = {
          totalSales: 131570,
          totalOrders: 422,
          averageOrderValue: 311.71,
          uniqueCustomers: 314,
          growthRate: 12.5,
          timeSeries: MOCK_SALES_DATA,
          topProducts: [
            { id: '1', name: 'Premium Organic Almonds', value: 18500, percentage: 14.1, change: 8.2 },
            { id: '2', name: 'Artisan Coffee Beans', value: 15200, percentage: 11.6, change: 15.3 },
            { id: '3', name: 'Organic Quinoa', value: 12800, percentage: 9.7, change: -2.1 },
            { id: '4', name: 'Natural Honey', value: 11400, percentage: 8.7, change: 22.5 },
            { id: '5', name: 'Coconut Oil', value: 9600, percentage: 7.3, change: 5.8 },
          ],
          topCustomers: [
            { id: '1', name: 'Metro Supermarket', value: 28500, percentage: 21.7, change: 18.2 },
            { id: '2', name: 'TechCorp Industries', value: 22100, percentage: 16.8, change: 12.4 },
            { id: '3', name: 'Fresh Foods Market', value: 18900, percentage: 14.4, change: -5.2 },
            { id: '4', name: 'Golden Gate Grocers', value: 15600, percentage: 11.9, change: 25.1 },
            { id: '5', name: 'Sunset Retail Chain', value: 13200, percentage: 10.0, change: 8.7 },
          ],
          paymentMethods: [
            { method: 'Credit Card', count: 185, value: 58200, percentage: 44.2 },
            { method: 'Bank Transfer', count: 142, value: 45300, percentage: 34.4 },
            { method: 'Cash', count: 95, value: 28070, percentage: 21.4 },
          ],
          salesByRegion: [
            { region: 'California', sales: 52600, percentage: 40.0 },
            { region: 'Texas', sales: 34200, percentage: 26.0 },
            { region: 'New York', sales: 28400, percentage: 21.6 },
            { region: 'Florida', sales: 16370, percentage: 12.4 },
          ],
        };

        setAnalytics(mockAnalytics);
      } catch (err) {
        setError('Failed to load sales analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [agencyId, filters]);

  return { analytics, loading, error };
};

export const useCustomerAnalytics = (agencyId: string, filters: AnalyticsFilters = {}) => {
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 600));

        const mockAnalytics: CustomerAnalytics = {
          totalCustomers: 1247,
          activeCustomers: 892,
          newCustomers: 156,
          churnRate: 8.2,
          averageLifetimeValue: 2840.5,
          customerSegments: [
            { segment: 'Premium', count: 125, percentage: 10.0, averageValue: 8500 },
            { segment: 'Standard', count: 748, percentage: 60.0, averageValue: 2100 },
            { segment: 'Basic', count: 374, percentage: 30.0, averageValue: 850 },
          ],
          retentionRates: [
            { month: 'Jan', rate: 94.2 },
            { month: 'Feb', rate: 92.8 },
            { month: 'Mar', rate: 91.5 },
            { month: 'Apr', rate: 93.1 },
            { month: 'May', rate: 89.7 },
            { month: 'Jun', rate: 90.4 },
          ],
          topCustomersByValue: [
            { id: '1', name: 'Metro Supermarket', value: 128500, percentage: 4.5, change: 18.2 },
            { id: '2', name: 'TechCorp Industries', value: 94200, percentage: 3.3, change: 12.4 },
            { id: '3', name: 'Fresh Foods Market', value: 76800, percentage: 2.7, change: -5.2 },
            { id: '4', name: 'Golden Gate Grocers', value: 65400, percentage: 2.3, change: 25.1 },
            { id: '5', name: 'Sunset Retail Chain', value: 58900, percentage: 2.1, change: 8.7 },
          ],
          customersByRegion: [
            { region: 'California', customers: 498, percentage: 40.0 },
            { region: 'Texas', customers: 324, percentage: 26.0 },
            { region: 'New York', customers: 269, percentage: 21.6 },
            { region: 'Florida', customers: 156, percentage: 12.4 },
          ],
        };

        setAnalytics(mockAnalytics);
      } catch (err) {
        setError('Failed to load customer analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [agencyId, filters]);

  return { analytics, loading, error };
};

export const useProductAnalytics = (agencyId: string, filters: AnalyticsFilters = {}) => {
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 700));

        const mockAnalytics: ProductAnalytics = {
          totalProducts: 2847,
          activeProducts: 2156,
          lowStockProducts: 342,
          outOfStockProducts: 89,
          totalInventoryValue: 1845600,
          topProductsBySales: [
            { id: '1', name: 'Premium Organic Almonds', value: 125600, percentage: 6.8, change: 8.2 },
            { id: '2', name: 'Artisan Coffee Beans', value: 98400, percentage: 5.3, change: 15.3 },
            { id: '3', name: 'Organic Quinoa', value: 87200, percentage: 4.7, change: -2.1 },
            { id: '4', name: 'Natural Honey', value: 76800, percentage: 4.2, change: 22.5 },
            { id: '5', name: 'Coconut Oil', value: 65400, percentage: 3.5, change: 5.8 },
          ],
          topProductsByMargin: [
            { id: '1', name: 'Premium Spice Blend', value: 68.5, percentage: 68.5, change: 12.3 },
            { id: '2', name: 'Artisan Chocolates', value: 62.8, percentage: 62.8, change: 8.7 },
            { id: '3', name: 'Gourmet Tea Collection', value: 58.2, percentage: 58.2, change: 15.1 },
            { id: '4', name: 'Organic Essential Oils', value: 54.6, percentage: 54.6, change: 22.4 },
            { id: '5', name: 'Premium Nuts Mix', value: 49.3, percentage: 49.3, change: 6.9 },
          ],
          categoryPerformance: [
            { category: 'Organic Foods', sales: 345200, margin: 42.5, products: 456 },
            { category: 'Beverages', sales: 287600, margin: 38.2, products: 324 },
            { category: 'Snacks', sales: 234800, margin: 45.1, products: 278 },
            { category: 'Health & Wellness', sales: 198400, margin: 52.3, products: 189 },
            { category: 'Condiments', sales: 156700, margin: 35.8, products: 234 },
          ],
          inventoryTurnover: [
            { product: 'Fresh Milk', turnoverRate: 24.5, daysToSell: 15 },
            { product: 'Bread Varieties', turnoverRate: 18.2, daysToSell: 20 },
            { product: 'Seasonal Fruits', turnoverRate: 15.8, daysToSell: 23 },
            { product: 'Yogurt Products', turnoverRate: 12.4, daysToSell: 29 },
            { product: 'Cheese Selection', turnoverRate: 9.6, daysToSell: 38 },
          ],
          priceAnalysis: [
            { priceRange: '$0-10', products: 1248, sales: 234500 },
            { priceRange: '$10-25', products: 892, sales: 456800 },
            { priceRange: '$25-50', products: 456, sales: 389200 },
            { priceRange: '$50-100', products: 189, sales: 234600 },
            { priceRange: '$100+', products: 62, sales: 187400 },
          ],
        };

        setAnalytics(mockAnalytics);
      } catch (err) {
        setError('Failed to load product analytics');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [agencyId, filters]);

  return { analytics, loading, error };
};
