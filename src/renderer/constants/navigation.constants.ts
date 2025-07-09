/**
 * Navigation Constants
 * Route definitions and navigation configuration
 * Following Instructions file standards
 */

import {
  Dashboard,
  People,
  Inventory,
  ShoppingCart,
  TrendingUp,
  Settings,
  Person,
  Business,
  Assessment,
  AccountBalance,
  SupervisorAccount,
  Map,
} from '@mui/icons-material';
import type { NavigationRoute } from '../types/navigation.types';

/**
 * Application routes configuration
 */
export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Protected routes
  DASHBOARD: '/',

  // Business modules
  CUSTOMERS: '/customers',
  CUSTOMERS_LIST: '/customers',
  CUSTOMERS_CREATE: '/customers/create',
  CUSTOMERS_DETAILS: '/customers/:id',

  PRODUCTS: '/products',
  PRODUCTS_LIST: '/products',
  PRODUCTS_CREATE: '/products/create',
  PRODUCTS_DETAILS: '/products/:id',

  INVENTORY: '/inventory',
  INVENTORY_DASHBOARD: '/inventory',

  ORDERS: '/orders',
  ORDERS_LIST: '/orders',
  ORDERS_CREATE: '/orders/create',
  ORDERS_DETAILS: '/orders/:id',

  ANALYTICS: '/analytics',
  ANALYTICS_DASHBOARD: '/analytics',
  ANALYTICS_SALES: '/analytics/sales',
  ANALYTICS_CUSTOMERS: '/analytics/customers',
  ANALYTICS_PRODUCTS: '/analytics/products',

  AGENCIES: '/agencies',
  AGENCIES_LIST: '/agencies',
  AGENCIES_CREATE: '/agencies/create',
  AGENCIES_DETAILS: '/agencies/:id',

  AREAS: '/areas',
  AREAS_LIST: '/areas',

  EMPLOYEES: '/employees',
  EMPLOYEES_LIST: '/employees',
  EMPLOYEES_CREATE: '/employees/create',
  EMPLOYEES_DETAILS: '/employees/:id',

  // System routes
  ADMIN_PANEL: '/admin',
  USERS: '/users',
  SETTINGS: '/settings',
  PROFILE: '/profile',

  // Development routes
  SUBSCRIPTION_TEST: '/subscription-test',
} as const;

/**
 * Navigation menu structure
 * Simplified structure following user requirements:
 * - Removed Agencies and Employees (moved to Admin Panel)
 * - Removed Profile (available in header)
 * - Simplified Customers, Products, Orders to single entries (like User Management)
 */
export const NAVIGATION_ROUTES: NavigationRoute[] = [
  {
    id: 'dashboard',
    label: 'navigation.dashboard',
    path: ROUTES.DASHBOARD,
    icon: Dashboard,
    requiresAuth: true,
    description: 'Main dashboard with overview and analytics',
    group: 'main',
  },
  {
    id: 'customers',
    label: 'navigation.customers',
    path: ROUTES.CUSTOMERS,
    icon: People,
    requiresAuth: true,
    description: 'Customer management and relationships',
    group: 'business',
  },
  {
    id: 'inventory',
    label: 'navigation.inventory',
    path: ROUTES.INVENTORY,
    icon: Inventory,
    requiresAuth: true,
    description: 'Comprehensive inventory and product management with multi-warehouse support',
    group: 'business',
  },
  {
    id: 'orders',
    label: 'navigation.orders',
    path: ROUTES.ORDERS,
    icon: ShoppingCart,
    requiresAuth: true,
    description: 'Order management and processing',
    group: 'business',
  },
  {
    id: 'analytics',
    label: 'navigation.analytics',
    path: ROUTES.ANALYTICS,
    icon: TrendingUp,
    requiresAuth: true,
    description: 'Business analytics and reporting',
    group: 'insights',
    children: [
      {
        id: 'analytics-dashboard',
        label: 'navigation.overview',
        path: ROUTES.ANALYTICS_DASHBOARD,
        icon: Assessment,
        requiresAuth: true,
        description: 'Analytics overview',
      },
      {
        id: 'analytics-sales',
        label: 'navigation.sales_analytics',
        path: ROUTES.ANALYTICS_SALES,
        icon: AccountBalance,
        requiresAuth: true,
        description: 'Sales performance analytics',
      },
      {
        id: 'analytics-customers',
        label: 'navigation.customer_analytics',
        path: ROUTES.ANALYTICS_CUSTOMERS,
        icon: People,
        requiresAuth: true,
        description: 'Customer behavior analytics',
      },
      {
        id: 'analytics-products',
        label: 'navigation.product_analytics',
        path: ROUTES.ANALYTICS_PRODUCTS,
        icon: Inventory,
        requiresAuth: true,
        description: 'Product performance analytics',
      },
    ],
  },
];

/**
 * System navigation routes
 * Profile removed as it's available in header banner
 * Admin Panel now accessible to agency admins with restricted modules
 */
export const SYSTEM_ROUTES: NavigationRoute[] = [
  {
    id: 'admin-panel',
    label: 'Admin Panel',
    path: ROUTES.ADMIN_PANEL,
    icon: SupervisorAccount,
    requiresAuth: true,
    description: 'Central administration panel for administrators',
    group: 'system',
    children: [
      {
        id: 'admin-users',
        label: 'User Management',
        path: ROUTES.USERS,
        icon: People,
        requiresAuth: true,
        description: 'Manage system users and administrators',
        requiredRole: 'super_admin',
      },
      {
        id: 'admin-areas',
        label: 'Area Management',
        path: ROUTES.AREAS,
        icon: Map,
        requiresAuth: true,
        description: 'Manage areas and territories',
      },
      {
        id: 'admin-agencies',
        label: 'Agency Management',
        path: ROUTES.AGENCIES,
        icon: Business,
        requiresAuth: true,
        description: 'Manage distribution agencies',
        requiredRole: 'super_admin',
      },
      {
        id: 'admin-employees',
        label: 'Employee Management',
        path: ROUTES.EMPLOYEES,
        icon: SupervisorAccount,
        requiresAuth: true,
        description: 'Manage agency employees',
        requiredRole: 'admin',
      },
      {
        id: 'admin-settings',
        label: 'System Settings',
        path: ROUTES.SETTINGS,
        icon: Settings,
        requiresAuth: true,
        description: 'Configure system-wide settings',
        requiredRole: 'admin',
      },
      // Development only - subscription testing
      ...(process.env.NODE_ENV === 'development'
        ? [
            {
              id: 'admin-subscription-test',
              label: 'Subscription Test',
              path: '/subscription-test',
              icon: Settings,
              requiresAuth: true,
              description: 'Test subscription management integration',
            },
          ]
        : []),
    ],
  },
];

/**
 * Navigation configuration
 */
export const NAVIGATION_CONFIG = {
  /** Default sidebar width */
  SIDEBAR_WIDTH: 280,
  /** Collapsed sidebar width */
  SIDEBAR_COLLAPSED_WIDTH: 64,
  /** Header height */
  HEADER_HEIGHT: 64,
  /** Animation duration for sidebar */
  ANIMATION_DURATION: 300,
  /** Breakpoint for mobile navigation */
  MOBILE_BREAKPOINT: 'md',
} as const;

/**
 * Route groups configuration
 */
export const ROUTE_GROUPS = {
  main: {
    label: 'Main',
    order: 1,
  },
  business: {
    label: 'Business',
    order: 2,
  },
  operations: {
    label: 'Operations',
    order: 3,
  },
  insights: {
    label: 'Analytics',
    order: 4,
  },
  system: {
    label: 'System',
    order: 5,
  },
} as const;
