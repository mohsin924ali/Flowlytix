/**
 * Type Definitions for Flowlytix Subscription Dashboard
 * Comprehensive type system following Instructions file standards
 */

// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription related types
export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum SubscriptionTier {
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export interface Subscription extends BaseEntity {
  customerName: string;
  customerId: string;
  licenseKey: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  features: string[];
  maxDevices: number;
  devicesConnected: number;
  startsAt: Date;
  expiresAt: Date;
  gracePeriodDays: number;
  lastActivity: Date;
  lastSyncAt: Date;
  notes?: string;
}

// Customer related types
export interface Customer extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: Address;
  subscriptions: Subscription[];
  totalDevices: number;
  status: CustomerStatus;
  lastLoginAt?: Date;
}

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Device related types
export interface Device extends BaseEntity {
  deviceId: string;
  deviceFingerprint: string;
  subscriptionId: string;
  customerId: string;
  deviceInfo: DeviceInfo;
  status: DeviceStatus;
  lastActivity: Date;
  activatedAt: Date;
  location?: DeviceLocation;
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
}

export interface DeviceInfo {
  platform: string;
  osVersion: string;
  appVersion: string;
  deviceName: string;
  deviceModel?: string;
  architecture?: string;
  screenResolution?: string;
  timezone?: string;
}

export interface DeviceLocation {
  country: string;
  city: string;
  latitude?: number;
  longitude?: number;
  ipAddress: string;
}

// Analytics types
export interface AnalyticsData {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  totalDevices: number;
  totalCustomers: number;
  monthlyRevenue: number;
  growthRate: number;
  churnRate: number;
  conversionRate: number;
}

export interface SubscriptionAnalytics {
  period: string;
  newSubscriptions: number;
  renewedSubscriptions: number;
  cancelledSubscriptions: number;
  revenue: number;
  averageLifetime: number;
  topTiers: TierAnalytics[];
}

export interface TierAnalytics {
  tier: SubscriptionTier;
  count: number;
  revenue: number;
  percentage: number;
}

export interface DeviceAnalytics {
  totalDevices: number;
  activeDevices: number;
  devicesByPlatform: PlatformAnalytics[];
  devicesByRegion: RegionAnalytics[];
  averageDevicesPerSubscription: number;
}

export interface PlatformAnalytics {
  platform: string;
  count: number;
  percentage: number;
}

export interface RegionAnalytics {
  region: string;
  count: number;
  percentage: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter and sort types
export interface SubscriptionFilters {
  status?: SubscriptionStatus[];
  tier?: SubscriptionTier[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
}

export interface CustomerFilters {
  status?: CustomerStatus[];
  search?: string;
  hasActiveSubscription?: boolean;
  registrationDate?: DateRange;
}

export interface DeviceFilters {
  status?: DeviceStatus[];
  platform?: string[];
  search?: string;
  subscriptionId?: string;
  customerId?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// Form types
export interface CreateSubscriptionForm {
  customerName: string;
  customerEmail: string;
  tier: SubscriptionTier;
  features: string[];
  maxDevices: number;
  startsAt: Date;
  expiresAt: Date;
  gracePeriodDays: number;
  notes?: string;
}

export interface UpdateSubscriptionForm {
  tier?: SubscriptionTier;
  features?: string[];
  maxDevices?: number;
  expiresAt?: Date;
  gracePeriodDays?: number;
  notes?: string;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  lastLoginAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPPORT = 'support',
  VIEWER = 'viewer',
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Component prop types
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

// Activity and audit types
export interface ActivityLog extends BaseEntity {
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export enum AlertType {
  SYSTEM = 'system',
  SECURITY = 'security',
  SUBSCRIPTION = 'subscription',
  DEVICE = 'device',
  BILLING = 'billing',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// All types and interfaces are already exported above
