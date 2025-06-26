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
  LocalShipping,
  Assessment,
  AccountBalance,
  SupervisorAccount,
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

  EMPLOYEES: '/employees',
  EMPLOYEES_LIST: '/employees',
  EMPLOYEES_CREATE: '/employees/create',
  EMPLOYEES_DETAILS: '/employees/:id',

  SHIPPING: '/shipping',
  SHIPPING_LIST: '/shipping',
  SHIPPING_CREATE: '/shipping/create',
  SHIPPING_TRACKING: '/shipping/tracking',

  // System routes
  USERS: '/users',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;

/**
 * Navigation menu structure
 */
export const NAVIGATION_ROUTES: NavigationRoute[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    icon: Dashboard,
    requiresAuth: true,
    description: 'Main dashboard with overview and analytics',
    group: 'main',
  },
  {
    id: 'customers',
    label: 'Customers',
    path: ROUTES.CUSTOMERS,
    icon: People,
    requiresAuth: true,
    description: 'Customer management and relationships',
    group: 'business',
    children: [
      {
        id: 'customers-list',
        label: 'All Customers',
        path: ROUTES.CUSTOMERS_LIST,
        icon: People,
        requiresAuth: true,
        description: 'View all customers',
      },
      {
        id: 'customers-create',
        label: 'Add Customer',
        path: ROUTES.CUSTOMERS_CREATE,
        icon: People,
        requiresAuth: true,
        description: 'Create new customer',
      },
    ],
  },
  {
    id: 'products',
    label: 'Products',
    path: ROUTES.PRODUCTS,
    icon: Inventory,
    requiresAuth: true,
    description: 'Product catalog and inventory management',
    group: 'business',
    children: [
      {
        id: 'products-list',
        label: 'All Products',
        path: ROUTES.PRODUCTS_LIST,
        icon: Inventory,
        requiresAuth: true,
        description: 'View all products',
      },
      {
        id: 'products-create',
        label: 'Add Product',
        path: ROUTES.PRODUCTS_CREATE,
        icon: Inventory,
        requiresAuth: true,
        description: 'Create new product',
      },
    ],
  },
  {
    id: 'orders',
    label: 'Orders',
    path: ROUTES.ORDERS,
    icon: ShoppingCart,
    requiresAuth: true,
    description: 'Order management and processing',
    group: 'business',
    children: [
      {
        id: 'orders-list',
        label: 'All Orders',
        path: ROUTES.ORDERS_LIST,
        icon: ShoppingCart,
        requiresAuth: true,
        description: 'View all orders',
      },
      {
        id: 'orders-create',
        label: 'Create Order',
        path: ROUTES.ORDERS_CREATE,
        icon: ShoppingCart,
        requiresAuth: true,
        description: 'Create new order',
      },
    ],
  },
  {
    id: 'agencies',
    label: 'Agencies',
    path: ROUTES.AGENCIES,
    icon: Business,
    requiresAuth: true,
    description: 'Agency management and relationships',
    group: 'business',
    children: [
      {
        id: 'agencies-list',
        label: 'All Agencies',
        path: ROUTES.AGENCIES_LIST,
        icon: Business,
        requiresAuth: true,
        description: 'View all agencies',
      },
      {
        id: 'agencies-create',
        label: 'Add Agency',
        path: ROUTES.AGENCIES_CREATE,
        icon: Business,
        requiresAuth: true,
        description: 'Create new agency',
      },
    ],
  },
  {
    id: 'employees',
    label: 'Employees',
    path: ROUTES.EMPLOYEES,
    icon: SupervisorAccount,
    requiresAuth: true,
    description: 'Employee management and human resources',
    group: 'business',
    children: [
      {
        id: 'employees-list',
        label: 'All Employees',
        path: ROUTES.EMPLOYEES_LIST,
        icon: SupervisorAccount,
        requiresAuth: true,
        description: 'View all employees',
      },
      {
        id: 'employees-create',
        label: 'Add Employee',
        path: ROUTES.EMPLOYEES_CREATE,
        icon: SupervisorAccount,
        requiresAuth: true,
        description: 'Create new employee',
      },
    ],
  },
  {
    id: 'shipping',
    label: 'Shipping',
    path: ROUTES.SHIPPING,
    icon: LocalShipping,
    requiresAuth: true,
    description: 'Shipping and logistics management',
    group: 'operations',
    children: [
      {
        id: 'shipping-list',
        label: 'All Shipments',
        path: ROUTES.SHIPPING_LIST,
        icon: LocalShipping,
        requiresAuth: true,
        description: 'View all shipments',
      },
      {
        id: 'shipping-tracking',
        label: 'Tracking',
        path: ROUTES.SHIPPING_TRACKING,
        icon: LocalShipping,
        requiresAuth: true,
        description: 'Track shipments',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: ROUTES.ANALYTICS,
    icon: TrendingUp,
    requiresAuth: true,
    description: 'Business analytics and reporting',
    group: 'insights',
    children: [
      {
        id: 'analytics-dashboard',
        label: 'Overview',
        path: ROUTES.ANALYTICS_DASHBOARD,
        icon: Assessment,
        requiresAuth: true,
        description: 'Analytics overview',
      },
      {
        id: 'analytics-sales',
        label: 'Sales Analytics',
        path: ROUTES.ANALYTICS_SALES,
        icon: AccountBalance,
        requiresAuth: true,
        description: 'Sales performance analytics',
      },
      {
        id: 'analytics-customers',
        label: 'Customer Analytics',
        path: ROUTES.ANALYTICS_CUSTOMERS,
        icon: People,
        requiresAuth: true,
        description: 'Customer behavior analytics',
      },
      {
        id: 'analytics-products',
        label: 'Product Analytics',
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
 */
export const SYSTEM_ROUTES: NavigationRoute[] = [
  {
    id: 'users',
    label: 'Users',
    path: ROUTES.USERS,
    icon: SupervisorAccount,
    requiresAuth: true,
    description: 'User management and administration',
    group: 'system',
  },
  {
    id: 'profile',
    label: 'Profile',
    path: ROUTES.PROFILE,
    icon: Person,
    requiresAuth: true,
    description: 'User profile and preferences',
    group: 'system',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: ROUTES.SETTINGS,
    icon: Settings,
    requiresAuth: true,
    description: 'Application settings and configuration',
    group: 'system',
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
