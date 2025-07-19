/**
 * Dashboard Layout Template
 * Main layout for authenticated users with sidebar and header
 * Following Instructions file standards and atomic design principles
 */

import React, { ReactNode } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar, Header } from '../../organisms';
import { useNavigationStore } from '../../../store/navigation.store';
import { useSubscription } from '../../../hooks/useSubscription';
import { NAVIGATION_ROUTES, SYSTEM_ROUTES, NAVIGATION_CONFIG } from '../../../constants/navigation.constants';
import type { NavigationRoute } from '../../../types/navigation.types';

/**
 * Dashboard Layout Props
 */
export interface DashboardLayoutProps {
  /** Child components */
  children: ReactNode;
  /** Page title */
  title?: string;
  /** Whether to show sidebar */
  showSidebar?: boolean;
  /** Whether to show header */
  showHeader?: boolean;
  /** Layout test id for testing */
  'data-testid'?: string;
}

/**
 * Dashboard Layout Component
 * Professional layout with sidebar navigation and main content area
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  showSidebar = true,
  showHeader = true,
  'data-testid': testId = 'dashboard-layout',
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down(NAVIGATION_CONFIG.MOBILE_BREAKPOINT));

  // Connect to navigation and subscription stores
  const { sidebarOpen, collapsed, activeRoute, toggleSidebar, toggleCollapsed, setActiveRoute } = useNavigationStore();
  const { subscriptionStatus, isActivated } = useSubscription();

  /**
   * Filter navigation items based on subscription status
   */
  const filterNavigationBySubscription = React.useCallback(
    (items: NavigationRoute[]): NavigationRoute[] => {
      // If not activated, show all items (this is handled by SubscriptionGate)
      if (!isActivated) {
        return items;
      }

      // If subscription is suspended or cancelled, only allow Dashboard and Analytics
      if (subscriptionStatus === 'suspended' || subscriptionStatus === 'cancelled') {
        return items.filter((item) => item.id === 'dashboard' || item.id === 'analytics');
      }

      // For active subscriptions or other statuses, show all items
      return items;
    },
    [isActivated, subscriptionStatus]
  );

  /**
   * Combine and filter navigation and system routes based on subscription
   */
  const allNavigationItems = React.useMemo(() => {
    const combinedItems = [...NAVIGATION_ROUTES, ...SYSTEM_ROUTES];
    return filterNavigationBySubscription(combinedItems);
  }, [filterNavigationBySubscription]);

  // Sync navigation store with current route
  React.useEffect(() => {
    if (location.pathname !== activeRoute) {
      setActiveRoute(location.pathname);
    }
  }, [location.pathname, activeRoute, setActiveRoute]);

  // Subscription-based route protection
  React.useEffect(() => {
    if (!isActivated) return; // Let SubscriptionGate handle non-activated states

    const isRestrictedRoute = !allNavigationItems.some((item) => {
      // Check if current path matches any allowed navigation item
      return (
        location.pathname === item.path ||
        location.pathname.startsWith(item.path + '/') ||
        (item.children &&
          item.children.some(
            (child) => location.pathname === child.path || location.pathname.startsWith(child.path + '/')
          ))
      );
    });

    // If on a restricted route with suspended/cancelled subscription, redirect to dashboard
    if (isRestrictedRoute && (subscriptionStatus === 'suspended' || subscriptionStatus === 'cancelled')) {
      console.warn(
        '🚫 DashboardLayout: Restricted route accessed with suspended subscription, redirecting to dashboard'
      );
      navigate('/', { replace: true });
    }
  }, [location.pathname, allNavigationItems, isActivated, subscriptionStatus, navigate]);

  // Calculate layout dimensions
  const sidebarWidth = showSidebar
    ? collapsed
      ? NAVIGATION_CONFIG.SIDEBAR_COLLAPSED_WIDTH
      : NAVIGATION_CONFIG.SIDEBAR_WIDTH
    : 0;

  const headerHeight = showHeader ? NAVIGATION_CONFIG.HEADER_HEIGHT : 0;

  /**
   * Handle navigation item click
   */
  const handleNavigate = (path: string) => {
    setActiveRoute(path);
    navigate(path);
  };

  return (
    <Box
      data-testid={testId}
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: `
                      radial-gradient(circle at 10% 20%, rgba(81, 63, 242, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 90% 80%, rgba(107, 82, 245, 0.05) 0%, transparent 50%),
          linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)
        `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar */}
      {showSidebar && (
        <Sidebar
          navigationItems={allNavigationItems}
          isOpen={true}
          isCollapsed={collapsed}
          activeRoute={activeRoute}
          onToggle={toggleSidebar}
          onCollapse={toggleCollapsed}
          onNavigate={handleNavigate}
          data-testid='dashboard-sidebar'
        />
      )}

      {/* Main Content Area */}
      <Box
        component='main'
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          position: 'relative',
          marginLeft: showSidebar ? `${sidebarWidth}px` : 0,
          transition: 'margin-left 0.3s ease',
        }}
      >
        {/* Professional Header */}
        {showHeader && (
          <Header
            sidebarOpen={sidebarOpen}
            sidebarCollapsed={collapsed}
            onToggleSidebar={toggleCollapsed}
            data-testid='dashboard-header'
          />
        )}

        {/* Content Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            position: 'relative',
            zIndex: 1,
            marginTop: showHeader ? `${headerHeight}px` : 0,
            minHeight: showHeader ? `calc(100vh - ${headerHeight}px)` : '100vh',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};
