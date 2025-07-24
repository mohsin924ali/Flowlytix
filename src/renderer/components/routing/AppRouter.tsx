/**
 * App Router Component
 * Main routing configuration for the application
 * Following Instructions file standards with strict TypeScript compliance
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ProtectedRoute } from './ProtectedRoute';
import { SubscriptionGate } from './SubscriptionGate';
import { LoginPage } from '../organisms/LoginPage/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { AdminPanelPage } from '../../pages/AdminPanelPage';
import { UsersPage } from '../../pages/UsersPage';
import { AgenciesPage } from '../../pages/AgenciesPage';
import { AreasPage } from '../../pages/AreasPage';
import { EmployeesPage } from '../../pages/EmployeesPage';
import { CustomersPage } from '../../pages/CustomersPage';
import InventoryPage from '../../pages/InventoryPage';
import { OrdersPage } from '../../pages/OrdersPage';
import { AnalyticsPage } from '../../pages/AnalyticsPage';
import { SalesAnalyticsPage } from '../../pages/SalesAnalyticsPage';
import { CustomerAnalyticsPage } from '../../pages/CustomerAnalyticsPage';
import { ProductAnalyticsPage } from '../../pages/ProductAnalyticsPage';
import { ReportsPage } from '../../pages/ReportsPage';
import { GenerateReportsPage } from '../../pages/GenerateReportsPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { SettingsPage } from '../../pages/SettingsPage';
import { DashboardLayout } from '../templates';
import { ROUTES } from '../../constants/navigation.constants';
import { useAuthStore } from '../../store/auth.store';
import { SubscriptionTestPage } from '../pages/SubscriptionTestPage';
// Logo path corrected to use public directory
const logoMainSrc = '/assets/images/logo-main.svg';

/**
 * Page transition variants
 */
const pageVariants = {
  initial: { opacity: 0, scale: 0.95 },
  in: { opacity: 1, scale: 1 },
  out: { opacity: 0, scale: 1.05 },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5,
};

/**
 * Placeholder page component for routes under development
 */
const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <DashboardLayout title={title}>
    <motion.div
      initial='initial'
      animate='in'
      exit='out'
      variants={pageVariants}
      transition={pageTransition}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          marginBottom: '1rem',
        }}
      >
        🚧
      </div>
      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: '1.1rem',
          color: '#666',
          maxWidth: '600px',
          lineHeight: 1.6,
        }}
      >
        {description}
      </p>
    </motion.div>
  </DashboardLayout>
);

/**
 * App Router Component
 */
export const AppRouter: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading } = useAuthStore();

  // Debug logging for router state
  console.log('🔀 AppRouter render:', {
    isAuthenticated: Boolean(isAuthenticated),
    hasUser: !!user,
    isLoading: Boolean(isLoading),
    currentPath: window.location.pathname,
  });

  /**
   * Navigate to dashboard when authentication state changes to true
   */
  useEffect(() => {
    if (isAuthenticated && user && window.location.pathname === '/login') {
      console.log('🎉 Authentication detected, navigating to dashboard...');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  /**
   * Handle successful login - now just a placeholder
   */
  const handleLoginSuccess = () => {
    console.log('🔄 Login process completed, waiting for auth state update...');
    // Navigation will be handled by the useEffect above
  };

  return (
    <AnimatePresence mode='wait'>
      <Routes>
        {/* Public Routes */}
        <Route
          path='/login'
          element={<LoginPage showDevMode={true} onLoginSuccess={handleLoginSuccess} logoSrc={logoMainSrc} />}
        />

        {/* Protected Routes */}
        <Route
          path='/'
          element={
            <ProtectedRoute>
              <SubscriptionGate>
                <DashboardPage />
              </SubscriptionGate>
            </ProtectedRoute>
          }
        />

        {/* Customer Routes */}
        <Route
          path='/customers'
          element={
            <ProtectedRoute>
              <SubscriptionGate>
                <CustomersPage />
              </SubscriptionGate>
            </ProtectedRoute>
          }
        />
        <Route
          path='/customers/create'
          element={
            <ProtectedRoute>
              <SubscriptionGate>
                <PlaceholderPage
                  title='Add New Customer'
                  description='Create new customer profiles with detailed information, contact details, and business relationships.'
                />
              </SubscriptionGate>
            </ProtectedRoute>
          }
        />
        <Route
          path='/customers/:id'
          element={
            <ProtectedRoute>
              <SubscriptionGate>
                <PlaceholderPage
                  title='Customer Details'
                  description='View and edit detailed customer information, order history, and relationship management.'
                />
              </SubscriptionGate>
            </ProtectedRoute>
          }
        />

        {/* Product Routes - Redirected to Inventory */}
        <Route path='/products' element={<Navigate to='/inventory' replace />} />
        <Route path='/products/create' element={<Navigate to='/inventory' replace />} />
        <Route path='/products/:id' element={<Navigate to='/inventory' replace />} />

        {/* Inventory Routes */}
        <Route
          path='/inventory'
          element={
            <ProtectedRoute>
              <SubscriptionGate>
                <InventoryPage />
              </SubscriptionGate>
            </ProtectedRoute>
          }
        />

        {/* Order Routes */}
        <Route
          path='/orders'
          element={
            <ProtectedRoute>
              <SubscriptionGate>
                <OrdersPage />
              </SubscriptionGate>
            </ProtectedRoute>
          }
        />
        <Route
          path='/orders/create'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Create New Order'
                description='Process new orders with inventory allocation, pricing calculation, and automated workflow management.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/orders/:id'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Order Details'
                description='View order details, track fulfillment status, and manage customer communications.'
              />
            </ProtectedRoute>
          }
        />

        {/* Agency Routes */}
        <Route
          path='/agencies'
          element={
            <ProtectedRoute>
              <AgenciesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/agencies/create'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Add New Agency'
                description='Register new distribution agencies with contact information, territories, and business terms.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/agencies/:id'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Agency Details'
                description='View agency information, performance metrics, and manage business relationships.'
              />
            </ProtectedRoute>
          }
        />

        {/* Area Routes */}
        <Route
          path='/areas'
          element={
            <ProtectedRoute>
              <AreasPage />
            </ProtectedRoute>
          }
        />

        {/* Employee Routes */}
        <Route
          path='/employees'
          element={
            <ProtectedRoute>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/employees/create'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Add New Employee'
                description='Register new employees with personal information, department assignment, and role configuration.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/employees/:id'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Employee Details'
                description='View employee information, performance metrics, and manage human resource details.'
              />
            </ProtectedRoute>
          }
        />

        {/* Analytics Routes */}
        <Route
          path='/analytics'
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/analytics/sales'
          element={
            <ProtectedRoute>
              <SalesAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/analytics/customers'
          element={
            <ProtectedRoute>
              <CustomerAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/analytics/products'
          element={
            <ProtectedRoute>
              <ProductAnalyticsPage />
            </ProtectedRoute>
          }
        />

        {/* Reports Routes */}
        <Route
          path='/reports'
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/reports/generate'
          element={
            <ProtectedRoute>
              <GenerateReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/reports/scheduled'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Scheduled Reports'
                description='Manage automated report generation and scheduling configurations.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/reports/history'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Reports History'
                description='Browse and download previously generated reports.'
              />
            </ProtectedRoute>
          }
        />

        {/* System Routes */}
        <Route
          path='/admin'
          element={
            <ProtectedRoute>
              <AdminPanelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/users'
          element={
            <ProtectedRoute requiredPermissions={['SUPER_ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/profile'
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/settings'
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Development/Testing Routes */}
        {process.env.NODE_ENV === 'development' && (
          <Route
            path='/subscription-test'
            element={
              <ProtectedRoute>
                <SubscriptionTestPage />
              </ProtectedRoute>
            }
          />
        )}

        {/* Fallback Route */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </AnimatePresence>
  );
};
