/**
 * Preload script for Flowlytix Distribution System
 * Implements secure IPC communication with context isolation
 * Following Electron security best practices
 */

console.log('🔧 Preload script is loading...');

import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

/**
 * API interface exposed to the renderer process
 */
interface ElectronAPI {
  // Application methods
  getAppVersion: () => Promise<string>;
  getSystemInfo: () => Promise<SystemInfo>;

  // Window management
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // File operations (secure)
  selectFile: (options?: FileSelectOptions) => Promise<string | null>;
  selectDirectory: (options?: DirectorySelectOptions) => Promise<string | null>;
  saveFile: (options: FileSaveOptions) => Promise<string | null>;

  // Database operations (through IPC)
  database: {
    query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
    execute: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>;
    transaction: (operations: DatabaseOperation[]) => Promise<unknown[]>;
  };

  // Authentication
  auth: {
    authenticateUser: (credentials: { email: string; password: string }) => Promise<AuthResult>;
    createUser: (params: CreateUserParams) => Promise<CreateUserResult>;
    getUserPermissions: (params: { userId: string }) => Promise<PermissionsResult>;
    listUsers: (params: ListUsersParams) => Promise<ListUsersResult>;
  };

  // Agency management
  agency: {
    createAgency: (data: CreateAgencyRequest) => Promise<AgencyResult>;
    getAgencies: (params?: any) => Promise<AgenciesResult>;
    getAgencyById: (params: { agencyId: string }) => Promise<AgencyResult>;
    updateAgency: (data: UpdateAgencyRequest) => Promise<AgencyResult>;
  };

  // Business domain operations
  inventory: {
    getProducts: (filters?: ProductFilters) => Promise<Product[]>;
    createProduct: (product: CreateProductRequest) => Promise<Product>;
    updateProduct: (id: string, updates: UpdateProductRequest) => Promise<Product>;
    deleteProduct: (id: string) => Promise<void>;
  };

  orders: {
    getOrders: (filters?: OrderFilters) => Promise<Order[]>;
    createOrder: (order: CreateOrderRequest) => Promise<Order>;
    updateOrder: (id: string, updates: UpdateOrderRequest) => Promise<Order>;
    cancelOrder: (id: string, reason: string) => Promise<void>;
  };

  customers: {
    getCustomers: (filters?: CustomerFilters) => Promise<Customer[]>;
    createCustomer: (customer: CreateCustomerRequest) => Promise<Customer>;
    updateCustomer: (id: string, updates: UpdateCustomerRequest) => Promise<Customer>;
    deleteCustomer: (id: string) => Promise<void>;
  };

  // Shipping operations
  shipping: {
    getShipments: (filters?: any) => Promise<any[]>;
    createShipment: (shipment: any) => Promise<any>;
    trackShipment: (trackingNumber: string) => Promise<any>;
  };

  // Lot Batch operations
  lotBatch: {
    getLotBatches: (filters?: any) => Promise<any[]>;
    createLotBatch: (lotBatch: any) => Promise<any>;
    updateLotBatch: (id: string, updates: any) => Promise<any>;
  };

  // Analytics and reporting operations
  analytics: {
    salesSummary: (params: SalesSummaryParams) => Promise<SalesSummaryResult>;
    salesTrends: (params: SalesTrendsParams) => Promise<SalesTrendsResult>;
    customerSegmentation: (params: CustomerSegmentationParams) => Promise<CustomerSegmentationResult>;
    productPerformance: (params: ProductPerformanceParams) => Promise<ProductPerformanceResult>;
    revenueForecast: (params: RevenueForecastParams) => Promise<RevenueForecastResult>;
    marketBasket: (params: MarketBasketParams) => Promise<MarketBasketResult>;
    customerLTV: (params: CustomerLTVParams) => Promise<CustomerLTVResult>;
    territoryPerformance: (params: TerritoryPerformanceParams) => Promise<TerritoryPerformanceResult>;
  };

  // Legacy reports (deprecated - use analytics instead)
  reports: {
    generateSalesReport: (params: SalesReportParams) => Promise<SalesReport>;
    generateInventoryReport: (params: InventoryReportParams) => Promise<InventoryReport>;
    exportReport: (report: Report, format: ExportFormat) => Promise<string>;
  };

  // Event handling
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: unknown[]) => void) => void;
  off: (channel: string, listener: (event: IpcRendererEvent, ...args: unknown[]) => void) => void;
  once: (channel: string, listener: (event: IpcRendererEvent, ...args: unknown[]) => void) => void;

  // Notifications
  showNotification: (options: NotificationOptions) => void;
  showErrorDialog: (title: string, content: string) => void;
  showConfirmDialog: (options: ConfirmDialogOptions) => Promise<boolean>;
}

/**
 * Type definitions for the API
 */
interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  totalMemory: number;
  freeMemory: number;
}

interface FileSelectOptions {
  title?: string;
  filters?: { name: string; extensions: string[] }[];
  multiSelections?: boolean;
}

interface DirectorySelectOptions {
  title?: string;
  defaultPath?: string;
}

interface FileSaveOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  content: string | Buffer;
}

interface DatabaseOperation {
  sql: string;
  params?: unknown[];
}

// Business domain types (following DDD principles)
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  searchTerm?: string;
}

interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
}

interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  stockQuantity?: number;
  category?: string;
}

interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

interface OrderFilters {
  customerId?: string;
  status?: OrderStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

interface CreateOrderRequest {
  customerId: string;
  items: OrderItem[];
}

interface UpdateOrderRequest {
  status?: OrderStatus;
  items?: OrderItem[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: Address;
  createdAt: Date;
  updatedAt: Date;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface CustomerFilters {
  searchTerm?: string;
  city?: string;
  state?: string;
}

interface CreateCustomerRequest {
  name: string;
  email: string;
  phone: string;
  address: Address;
}

interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: Address;
}

interface SalesReport {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Product[];
  salesByPeriod: SalesPeriod[];
}

interface SalesPeriod {
  period: string;
  sales: number;
  orders: number;
}

interface InventoryReport {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: Product[];
  topCategories: CategorySummary[];
}

interface CategorySummary {
  category: string;
  productCount: number;
  totalValue: number;
}

interface Report {
  type: 'sales' | 'inventory' | 'customer';
  data: unknown;
  generatedAt: Date;
}

type ExportFormat = 'pdf' | 'excel' | 'csv';

interface SalesReportParams {
  dateFrom: Date;
  dateTo: Date;
  groupBy?: 'day' | 'week' | 'month';
}

interface InventoryReportParams {
  includeOutOfStock?: boolean;
  category?: string;
}

// Analytics API Type Definitions
interface SalesSummaryParams {
  agencyId: string;
  userId: string;
  periodType:
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'LAST_QUARTER'
    | 'THIS_YEAR'
    | 'LAST_YEAR'
    | 'YEAR_TO_DATE'
    | 'CUSTOM';
  customStartDate?: string;
  customEndDate?: string;
  groupBy: Array<'day' | 'week' | 'month' | 'quarter' | 'year' | 'customer' | 'product' | 'area'>;
  metrics: {
    totalSales: boolean;
    orderCount: boolean;
    averageOrderValue: boolean;
    customerCount: boolean;
    topProducts?: boolean;
    topCustomers?: boolean;
    paymentMethods?: boolean;
    fulfillmentStatus?: boolean;
    growthAnalysis?: boolean;
  };
  filters?: {
    customerIds?: string[];
    productIds?: string[];
    areaIds?: string[];
    workerIds?: string[];
    paymentMethods?: Array<'CASH' | 'CREDIT' | 'BANK_TRANSFER' | 'CARD'>;
    orderStatusList?: Array<'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED'>;
    minimumOrderValue?: number;
    maximumOrderValue?: number;
  };
  options?: {
    includeComparisons?: boolean;
    comparisonPeriod?:
      | 'TODAY'
      | 'YESTERDAY'
      | 'LAST_7_DAYS'
      | 'LAST_30_DAYS'
      | 'LAST_90_DAYS'
      | 'THIS_MONTH'
      | 'LAST_MONTH'
      | 'THIS_QUARTER'
      | 'LAST_QUARTER'
      | 'THIS_YEAR'
      | 'LAST_YEAR'
      | 'YEAR_TO_DATE';
    topN?: number;
    currency?: string;
    timezone?: string;
    includeForecast?: boolean;
    forecastPeriods?: number;
  };
  requestId?: string;
}

interface SalesSummaryResult {
  success: boolean;
  data?: {
    summary: {
      totalSales: string;
      totalOrders: number;
      averageOrderValue: string;
      uniqueCustomers: number;
      growthRate?: number;
    };
    timeSeries?: Array<{
      period: string;
      periodStart: string;
      periodEnd: string;
      totalSales: string;
      orderCount: number;
      averageOrderValue: string;
      uniqueCustomers: number;
    }>;
    topProducts?: Array<{
      id: string;
      name: string;
      code: string;
      totalSales: string;
      orderCount: number;
      rank: number;
    }>;
    topCustomers?: Array<{
      id: string;
      name: string;
      code: string;
      totalSales: string;
      orderCount: number;
      rank: number;
    }>;
    paymentBreakdown?: Array<{
      paymentMethod: string;
      totalSales: string;
      orderCount: number;
      percentage: number;
    }>;
    fulfillmentBreakdown?: Array<{
      status: string;
      orderCount: number;
      totalValue: string;
      percentage: number;
    }>;
    comparison?: {
      currentPeriod: {
        totalSales: string;
        orderCount: number;
        averageOrderValue: string;
      };
      previousPeriod: {
        totalSales: string;
        orderCount: number;
        averageOrderValue: string;
      };
      growth: {
        salesGrowthRate: number;
        orderGrowthRate: number;
        avgOrderValueGrowthRate: number;
      };
    };
  };
  error?: string;
  validationErrors?: Record<string, string[]>;
  timestamp: number;
  operation: string;
  duration: number;
  requestId?: string;
}

interface SalesTrendsParams {
  agencyId: string;
  userId: string;
  periodType:
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'LAST_QUARTER'
    | 'THIS_YEAR'
    | 'LAST_YEAR'
    | 'YEAR_TO_DATE';
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  includeForecasting?: boolean;
  seasonalAdjustment?: boolean;
  requestId?: string;
}

interface SalesTrendsResult {
  success: boolean;
  data?: {
    trends: Array<{
      period: string;
      periodStart: string;
      periodEnd: string;
      actualSales: string;
      forecastedSales?: string;
      variance?: number;
      seasonalIndex?: number;
      trendIndex?: number;
      orderCount: number;
      averageOrderValue: string;
      uniqueCustomers: number;
      conversionRate?: number;
    }>;
    forecasts?: Array<{
      period: string;
      forecastedSales: string;
      confidence: number;
    }>;
    seasonalFactors?: number[];
  };
  error?: string;
  timestamp: number;
  operation: string;
  duration: number;
  requestId?: string;
}

interface CustomerSegmentationParams {
  agencyId: string;
  userId: string;
  periodType:
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'LAST_QUARTER'
    | 'THIS_YEAR'
    | 'LAST_YEAR'
    | 'YEAR_TO_DATE';
  segmentationModel: 'RFM' | 'CLV' | 'BEHAVIORAL' | 'GEOGRAPHIC';
  includeChurnRisk?: boolean;
  includeGrowthPotential?: boolean;
  requestId?: string;
}

interface CustomerSegmentationResult {
  success: boolean;
  data?: {
    segments: Array<{
      segmentId: string;
      segmentName: string;
      description: string;
      criteria: Record<string, any>;
      customerCount: number;
      totalRevenue: string;
      averageOrderValue: string;
      purchaseFrequency: number;
      churnRisk?: string;
      growthPotential?: string;
      recommendedActions: string[];
    }>;
    totalCustomers: number;
    segmentationModel: string;
  };
  error?: string;
  timestamp: number;
  operation: string;
  duration: number;
  requestId?: string;
}

interface ProductPerformanceParams {
  agencyId: string;
  userId: string;
  periodType:
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'LAST_QUARTER'
    | 'THIS_YEAR'
    | 'LAST_YEAR'
    | 'YEAR_TO_DATE';
  analysisType: 'SALES_VELOCITY' | 'MARGIN_ANALYSIS' | 'INVENTORY_TURNOVER' | 'CROSS_SELL';
  categoryId?: string;
  minimumOrders?: number;
  includeSeasonality?: boolean;
  requestId?: string;
}

interface ProductPerformanceResult {
  success: boolean;
  data?: {
    products: Array<{
      productId: string;
      productName: string;
      analysisMetrics: Record<string, any>;
      performance: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
      recommendations: string[];
    }>;
    analysisType: string;
    totalProducts: number;
  };
  error?: string;
  timestamp: number;
  operation: string;
  duration: number;
  requestId?: string;
}

interface RevenueForecastParams {
  agencyId: string;
  userId: string;
  historicalPeriodType:
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'LAST_QUARTER'
    | 'THIS_YEAR'
    | 'LAST_YEAR'
    | 'YEAR_TO_DATE';
  forecastPeriodType: 'NEXT_7_DAYS' | 'NEXT_30_DAYS' | 'NEXT_90_DAYS' | 'NEXT_MONTH' | 'NEXT_QUARTER' | 'NEXT_YEAR';
  forecastModel?: 'LINEAR' | 'EXPONENTIAL' | 'SEASONAL' | 'ARIMA';
  confidenceLevel?: number;
  includeScenarios?: boolean;
  requestId?: string;
}

interface RevenueForecastResult {
  success: boolean;
  data?: {
    forecast: {
      periods: Array<{
        period: string;
        forecastedRevenue: string;
        confidence: number;
        lowerBound: string;
        upperBound: string;
      }>;
      model: string;
      accuracy: number;
    };
    scenarios?: {
      optimistic: Array<{ period: string; revenue: string }>;
      pessimistic: Array<{ period: string; revenue: string }>;
      mostLikely: Array<{ period: string; revenue: string }>;
    };
  };
  error?: string;
  timestamp: number;
  operation: string;
  duration: number;
  requestId?: string;
}

interface MarketBasketParams {
  agencyId: string;
  userId: string;
  periodType:
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'LAST_QUARTER'
    | 'THIS_YEAR'
    | 'LAST_YEAR'
    | 'YEAR_TO_DATE';
  minimumSupport?: number;
  minimumConfidence?: number;
  productIds?: string[];
  requestId?: string;
}

interface MarketBasketResult {
  success: boolean;
  data?: {
    rules: Array<{
      antecedent: string[];
      consequent: string[];
      support: number;
      confidence: number;
      lift: number;
      conviction: number;
    }>;
    totalRules: number;
    averageConfidence: number;
  };
  error?: string;
  timestamp: number;
  operation: string;
  duration: number;
  requestId?: string;
}

interface CustomerLTVParams {
  agencyId: string;
  userId: string;
  customerId?: string;
  calculationMethod?: 'HISTORICAL' | 'PREDICTIVE' | 'COHORT';
  timeHorizon?: number;
  includeAcquisitionCosts?: boolean;
  includeRetentionCosts?: boolean;
  requestId?: string;
}

interface CustomerLTVResult {
  success: boolean;
  data?: {
    customers: Array<{
      customerId: string;
      customerName: string;
      ltv: string;
      acquisitionCost?: string;
      retentionCost?: string;
      predictedChurn?: number;
      segmentClassification: string;
    }>;
    averageLTV: string;
    totalCustomers: number;
  };
  error?: string;
  timestamp: number;
  operation: string;
  duration: number;
  requestId?: string;
}

interface TerritoryPerformanceParams {
  agencyId: string;
  userId: string;
  periodType:
    | 'TODAY'
    | 'YESTERDAY'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'LAST_90_DAYS'
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'LAST_QUARTER'
    | 'THIS_YEAR'
    | 'LAST_YEAR'
    | 'YEAR_TO_DATE';
  territoryType: 'AREA' | 'WORKER' | 'REGION' | 'ZIP_CODE';
  includeComparisons?: boolean;
  benchmarkType?: 'HISTORICAL' | 'PEER' | 'TARGET';
  requestId?: string;
}

interface TerritoryPerformanceResult {
  success: boolean;
  data?: {
    territories: Array<{
      territoryId: string;
      territoryName: string;
      totalSales: string;
      orderCount: number;
      customerCount: number;
      performance: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
      benchmark?: {
        type: string;
        value: string;
        variance: number;
      };
    }>;
    territoryType: string;
    totalTerritories: number;
  };
  error?: string;
  timestamp: number;
  operation: string;
  duration: number;
  requestId?: string;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  urgent?: boolean;
}

interface ConfirmDialogOptions {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'question';
  buttons: string[];
  defaultButton?: number;
}

// Auth types
interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    permissions: string[];
  };
  error?: string;
}

interface PermissionsResult {
  permissions: string[];
  error?: string;
}

interface ListUsersParams {
  requestedBy: string;
  limit?: number;
  offset?: number;
  sortBy?: 'firstName' | 'lastName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
  role?: string;
  status?: string;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  isLocked?: boolean;
}

interface CreateUserParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  agencyId?: string;
  createdBy: string;
}

interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

interface ListUsersResult {
  success: boolean;
  data?: {
    success: boolean;
    users: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      fullName: string;
      role: string;
      roleName: string;
      status: string;
      createdAt: Date;
      lastLoginAt?: Date;
      isAccountLocked: boolean;
      loginAttempts: number;
    }>;
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    error?: string;
  };
  error?: string;
}

// Agency types - Updated to match backend schema
interface CreateAgencyRequest {
  name: string;
  databasePath: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  requestedBy: string;

  // Business settings as flat structure (matching backend schema)
  allowCreditSales: boolean;
  defaultCreditDays: number;
  maxCreditLimit: number;
  requireApprovalForOrders: boolean;
  enableInventoryTracking: boolean;
  taxRate: number;
  currency: string;

  // Business hours
  businessHoursStart: string;
  businessHoursEnd: string;
  businessHoursTimezone: string;

  // Notification settings
  notificationsLowStock: boolean;
  notificationsOverduePayments: boolean;
  notificationsNewOrders: boolean;
}

interface UpdateAgencyRequest {
  agencyId: string;
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  settings?: {
    allowCreditSales?: boolean;
    defaultCreditDays?: number;
    maxCreditLimit?: number;
    requireApprovalForOrders?: boolean;
    enableInventoryTracking?: boolean;
    taxRate?: number;
    currency?: string;
    businessHours?: {
      start?: string;
      end?: string;
      timezone?: string;
    };
  };
}

interface AgencyResult {
  success: boolean;
  agencyId?: string;
  agencyName?: string;
  databasePath?: string;
  isOperational?: boolean;
  error?: string;
}

interface AgenciesResult {
  success: boolean;
  agencies?: Array<{
    id: string;
    name: string;
    status: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    createdAt: string;
  }>;
  error?: string;
}

/**
 * Secure API implementation
 */
const electronAPI: ElectronAPI = {
  // Application methods
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getSystemInfo: () => ipcRenderer.invoke('app:get-system-info'),

  // Window management
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // File operations
  selectFile: (options) => ipcRenderer.invoke('file:select', options),
  selectDirectory: (options) => ipcRenderer.invoke('file:select-directory', options),
  saveFile: (options) => ipcRenderer.invoke('file:save', options),

  // Database operations
  database: {
    query: (sql, params) => ipcRenderer.invoke('database:query', sql, params),
    execute: (sql, params) => ipcRenderer.invoke('database:execute', sql, params),
    transaction: (operations) => ipcRenderer.invoke('database:transaction', operations),
  },

  // Authentication
  auth: {
    authenticateUser: async (credentials) => {
      console.log('🔌 Preload: authenticateUser called with:', credentials);
      try {
        const result = await ipcRenderer.invoke('auth:authenticate-user', credentials);
        console.log('🔌 Preload: IPC result received:', result);
        return result;
      } catch (error) {
        console.error('🔌 Preload: IPC error:', error);
        throw error;
      }
    },
    createUser: (params) => ipcRenderer.invoke('auth:create-user', params),
    getUserPermissions: (params) => ipcRenderer.invoke('auth:get-user-permissions', params),
    listUsers: (params) => ipcRenderer.invoke('auth:list-users', params),
  },

  // Agency management
  agency: {
    createAgency: (data) => ipcRenderer.invoke('agency:create-agency', data),
    getAgencies: (params) => ipcRenderer.invoke('agency:get-agencies', params),
    getAgencyById: (params) => ipcRenderer.invoke('agency:get-agency-by-id', params),
    updateAgency: (data) => ipcRenderer.invoke('agency:update-agency', data),
  },

  // Business domain operations
  inventory: {
    getProducts: (filters) => ipcRenderer.invoke('inventory:get-products', filters),
    createProduct: (product) => ipcRenderer.invoke('inventory:create-product', product),
    updateProduct: (id, updates) => ipcRenderer.invoke('inventory:update-product', id, updates),
    deleteProduct: (id) => ipcRenderer.invoke('inventory:delete-product', id),
  },

  orders: {
    getOrders: (filters) => ipcRenderer.invoke('order:get-orders', filters),
    createOrder: (order) => ipcRenderer.invoke('order:create-order', order),
    updateOrder: (id, updates) => ipcRenderer.invoke('order:update-order', id, updates),
    cancelOrder: (id, reason) => ipcRenderer.invoke('order:cancel-order', id, { reason }),
  },

  customers: {
    getCustomers: (filters) => ipcRenderer.invoke('customer:get-customers', filters),
    createCustomer: (customer) => ipcRenderer.invoke('customer:create-customer', customer),
    updateCustomer: (id, updates) => ipcRenderer.invoke('customer:update-customer', id, updates),
    deleteCustomer: (id) => ipcRenderer.invoke('customer:delete-customer', id),
  },

  // Shipping operations
  shipping: {
    getShipments: (filters?: any) => ipcRenderer.invoke('shipping:get-shipments', filters),
    createShipment: (shipment: any) => ipcRenderer.invoke('shipping:create-shipping', shipment),
    trackShipment: (trackingNumber: string) => ipcRenderer.invoke('shipping:get-shipping-by-tracking', trackingNumber),
  },

  // Lot Batch operations
  lotBatch: {
    getLotBatches: (filters?: any) => ipcRenderer.invoke('lot-batch:list', filters),
    createLotBatch: (lotBatch: any) => ipcRenderer.invoke('lot-batch:create', lotBatch),
    updateLotBatch: (id: string, updates: any) => ipcRenderer.invoke('lot-batch:update', id, updates),
  },

  // Analytics operations
  analytics: {
    salesSummary: (params) => ipcRenderer.invoke('analytics:sales-summary', params),
    salesTrends: (params) => ipcRenderer.invoke('analytics:sales-trends', params),
    customerSegmentation: (params) => ipcRenderer.invoke('analytics:customer-segmentation', params),
    productPerformance: (params) => ipcRenderer.invoke('analytics:product-performance', params),
    revenueForecast: (params) => ipcRenderer.invoke('analytics:revenue-forecast', params),
    marketBasket: (params) => ipcRenderer.invoke('analytics:market-basket', params),
    customerLTV: (params) => ipcRenderer.invoke('analytics:customer-ltv', params),
    territoryPerformance: (params) => ipcRenderer.invoke('analytics:territory-performance', params),
  },

  // Legacy reports (deprecated - use analytics instead)
  reports: {
    generateSalesReport: (params) => ipcRenderer.invoke('reports:generate-sales', params),
    generateInventoryReport: (params) => ipcRenderer.invoke('reports:generate-inventory', params),
    exportReport: (report, format) => ipcRenderer.invoke('reports:export', report, format),
  },

  // Event handling
  on: (channel, listener) => {
    // Validate channel name for security
    if (isValidChannel(channel)) {
      ipcRenderer.on(channel, listener);
    }
  },

  off: (channel, listener) => {
    if (isValidChannel(channel)) {
      ipcRenderer.off(channel, listener);
    }
  },

  once: (channel, listener) => {
    if (isValidChannel(channel)) {
      ipcRenderer.once(channel, listener);
    }
  },

  // Notifications
  showNotification: (options) => ipcRenderer.send('notification:show', options),
  showErrorDialog: (title, content) => ipcRenderer.send('dialog:error', title, content),
  showConfirmDialog: (options) => ipcRenderer.invoke('dialog:confirm', options),
};

/**
 * Validate IPC channel names for security
 * @param channel - Channel name to validate
 * @returns True if channel is allowed
 */
function isValidChannel(channel: string): boolean {
  const allowedChannels = [
    'app:',
    'window:',
    'file:',
    'database:',
    'auth:',
    'agency:',
    'product:',
    'customer:',
    'order:',
    'shipping:',
    'lot-batch:',
    'analytics:',
    'reports:',
    'notification:',
    'dialog:',
  ];

  return allowedChannels.some((prefix) => channel.startsWith(prefix));
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Add debugging to verify preload script is loaded
console.log('🔧 Preload script loaded successfully');
console.log('🔧 Electron API exposed to renderer:', Object.keys(electronAPI));

// Export types for TypeScript support
export type { ElectronAPI, SystemInfo, Product, Order, Customer };
