/**
 * Navigation Store
 * Zustand store for navigation state management
 * Following Instructions file standards with strict typing
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { NavigationState, BreadcrumbItem, NavigationRoute } from '../types/navigation.types';
import { NAVIGATION_ROUTES, SYSTEM_ROUTES, ROUTES } from '../constants/navigation.constants';

/**
 * Navigation store interface
 */
interface NavigationStore extends NavigationState {
  // Actions
  setActiveRoute: (route: string) => void;
  toggleSidebar: () => void;
  toggleCollapsed: () => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setSidebarOpen: (open: boolean) => void;

  // Computed values
  getAllRoutes: () => NavigationRoute[];
  getRouteByPath: (path: string) => NavigationRoute | undefined;
  getRouteById: (id: string) => NavigationRoute | undefined;
  isRouteActive: (path: string) => boolean;
}

/**
 * Initial navigation state
 */
const initialState: NavigationState = {
  activeRoute: ROUTES.DASHBOARD,
  sidebarOpen: true,
  collapsed: false,
  breadcrumbs: [
    {
      label: 'Dashboard',
      path: ROUTES.DASHBOARD,
      current: true,
    },
  ],
};

/**
 * Navigation store
 */
export const useNavigationStore = create<NavigationStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Actions
      setActiveRoute: (route: string) => {
        set(
          (state) => ({
            ...state,
            activeRoute: route,
          }),
          false,
          'navigation/setActiveRoute'
        );
      },

      toggleSidebar: () => {
        set(
          (state) => ({
            ...state,
            sidebarOpen: !state.sidebarOpen,
          }),
          false,
          'navigation/toggleSidebar'
        );
      },

      toggleCollapsed: () => {
        set(
          (state) => ({
            ...state,
            collapsed: !state.collapsed,
          }),
          false,
          'navigation/toggleCollapsed'
        );
      },

      setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => {
        set(
          (state) => ({
            ...state,
            breadcrumbs,
          }),
          false,
          'navigation/setBreadcrumbs'
        );
      },

      setSidebarOpen: (open: boolean) => {
        set(
          (state) => ({
            ...state,
            sidebarOpen: open,
          }),
          false,
          'navigation/setSidebarOpen'
        );
      },

      // Computed values
      getAllRoutes: () => {
        return [...NAVIGATION_ROUTES, ...SYSTEM_ROUTES];
      },

      getRouteByPath: (path: string): NavigationRoute | undefined => {
        const allRoutes = get().getAllRoutes();

        // First, try exact match
        let route = allRoutes.find((r) => r.path === path);
        if (route) return route;

        // Then check children
        for (const parentRoute of allRoutes) {
          if (parentRoute.children) {
            route = parentRoute.children.find((child) => child.path === path);
            if (route) return route;
          }
        }

        // Finally, try pattern matching for dynamic routes
        for (const parentRoute of allRoutes) {
          if (parentRoute.path.includes(':')) {
            const pattern = parentRoute.path.replace(/:[^/]+/g, '[^/]+');
            const regex = new RegExp(`^${pattern}$`);
            if (regex.test(path)) return parentRoute;
          }

          if (parentRoute.children) {
            for (const child of parentRoute.children) {
              if (child.path.includes(':')) {
                const pattern = child.path.replace(/:[^/]+/g, '[^/]+');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(path)) return child;
              }
            }
          }
        }

        return undefined;
      },

      getRouteById: (id: string): NavigationRoute | undefined => {
        const allRoutes = get().getAllRoutes();

        // Check top-level routes
        let route = allRoutes.find((r) => r.id === id);
        if (route) return route;

        // Check children
        for (const parentRoute of allRoutes) {
          if (parentRoute.children) {
            route = parentRoute.children.find((child) => child.id === id);
            if (route) return route;
          }
        }

        return undefined;
      },

      isRouteActive: (path: string): boolean => {
        const { activeRoute } = get();

        // Exact match
        if (activeRoute === path) return true;

        // Parent route match (for nested routes)
        if (path !== ROUTES.DASHBOARD && activeRoute.startsWith(path)) {
          return true;
        }

        return false;
      },
    }),
    {
      name: 'navigation-store',
      // Only serialize state, not computed functions
      partialize: (state: NavigationStore) => ({
        activeRoute: state.activeRoute,
        sidebarOpen: state.sidebarOpen,
        collapsed: state.collapsed,
        breadcrumbs: state.breadcrumbs,
      }),
    }
  )
);

/**
 * Navigation store selectors
 */
export const navigationSelectors = {
  // State selectors
  activeRoute: (state: NavigationStore) => state.activeRoute,
  sidebarOpen: (state: NavigationStore) => state.sidebarOpen,
  collapsed: (state: NavigationStore) => state.collapsed,
  breadcrumbs: (state: NavigationStore) => state.breadcrumbs,

  // Computed selectors
  getAllRoutes: (state: NavigationStore) => state.getAllRoutes(),
  getRouteByPath: (state: NavigationStore) => state.getRouteByPath,
  getRouteById: (state: NavigationStore) => state.getRouteById,
  isRouteActive: (state: NavigationStore) => state.isRouteActive,
};
