/**
 * Navigation Types
 * Type definitions for navigation system
 * Following Instructions file standards with strict typing
 */

import { ReactNode } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';

/**
 * Navigation route interface
 */
export interface NavigationRoute {
  /** Unique route identifier */
  id: string;
  /** Display label for the route */
  label: string;
  /** Route path */
  path: string;
  /** Material-UI icon component */
  icon: SvgIconComponent;
  /** Whether route requires authentication */
  requiresAuth: boolean;
  /** Route description for accessibility */
  description?: string;
  /** Child routes for nested navigation */
  children?: NavigationRoute[];
  /** Whether route is disabled */
  disabled?: boolean;
  /** Badge count for notifications */
  badge?: number;
  /** Route group for organization */
  group?: string;
  /** Required user role to access this route */
  requiredRole?: string;
}

/**
 * Navigation state interface
 */
export interface NavigationState {
  /** Currently active route */
  activeRoute: string;
  /** Whether sidebar is open */
  sidebarOpen: boolean;
  /** Whether navigation is collapsed */
  collapsed: boolean;
  /** Breadcrumb items */
  breadcrumbs: BreadcrumbItem[];
}

/**
 * Breadcrumb item interface
 */
export interface BreadcrumbItem {
  /** Display label */
  label: string;
  /** Route path */
  path?: string;
  /** Whether item is current page */
  current?: boolean;
  /** Icon for breadcrumb */
  icon?: SvgIconComponent;
}

/**
 * Navigation context interface
 */
export interface NavigationContextType {
  /** Navigation state */
  state: NavigationState;
  /** Set active route */
  setActiveRoute: (route: string) => void;
  /** Toggle sidebar */
  toggleSidebar: () => void;
  /** Toggle navigation collapse */
  toggleCollapsed: () => void;
  /** Set breadcrumbs */
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  /** Get route by path */
  getRouteByPath: (path: string) => NavigationRoute | undefined;
}

/**
 * Protected route props
 */
export interface ProtectedRouteProps {
  /** Child components */
  children: ReactNode;
  /** Required permissions */
  requiredPermissions?: string[];
  /** Fallback component when not authorized */
  fallback?: ReactNode;
}

/**
 * Layout props interface
 */
export interface LayoutProps {
  /** Child components */
  children: ReactNode;
  /** Page title */
  title?: string;
  /** Whether to show sidebar */
  showSidebar?: boolean;
  /** Whether to show header */
  showHeader?: boolean;
}
