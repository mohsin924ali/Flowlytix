/**
 * App Router Component
 * Main routing configuration for the application
 * Following Instructions file standards with strict TypeScript compliance
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../organisms/LoginPage/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { UsersPage } from '../../pages/UsersPage';
import { AgenciesPage } from '../../pages/AgenciesPage';
import { EmployeesPage } from '../../pages/EmployeesPage';
import { ROUTES } from '../../constants/navigation.constants';
import { useAuthStore } from '../../store/auth.store';
import logoMainSrc from '../../assets/images/logo-main.svg';

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
);

/**
 * App Router Component
 */
export const AppRouter: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

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
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Routes */}
        <Route
          path='/customers'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Customer Management'
                description='Comprehensive customer relationship management system. Manage customer profiles, track interactions, and analyze customer behavior patterns.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/customers/create'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Add New Customer'
                description='Create new customer profiles with detailed information, contact details, and business relationships.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/customers/:id'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Customer Details'
                description='View and edit detailed customer information, order history, and relationship management.'
              />
            </ProtectedRoute>
          }
        />

        {/* Product Routes */}
        <Route
          path='/products'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Product Catalog'
                description='Manage your complete product inventory with advanced categorization, pricing, and stock management.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/products/create'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Add New Product'
                description='Create new products with detailed specifications, pricing, and inventory management.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/products/:id'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Product Details'
                description='View and edit product information, manage inventory levels, and track product performance.'
              />
            </ProtectedRoute>
          }
        />

        {/* Order Routes */}
        <Route
          path='/orders'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Order Management'
                description='Comprehensive order processing system with real-time tracking, fulfillment management, and customer communication.'
              />
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

        {/* Shipping Routes */}
        <Route
          path='/shipping'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Shipping Management'
                description='Comprehensive shipping and logistics management with real-time tracking and delivery coordination.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/shipping/tracking'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Shipment Tracking'
                description='Track all shipments in real-time with detailed status updates and delivery confirmations.'
              />
            </ProtectedRoute>
          }
        />

        {/* Analytics Routes */}
        <Route
          path='/analytics'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Analytics Dashboard'
                description='Comprehensive business analytics with real-time insights, performance metrics, and predictive analytics.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/analytics/sales'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Sales Analytics'
                description='Detailed sales performance analysis with trends, forecasting, and revenue optimization insights.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/analytics/customers'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Customer Analytics'
                description='Customer behavior analysis, segmentation insights, and lifetime value calculations.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/analytics/products'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Product Analytics'
                description='Product performance metrics, inventory optimization, and demand forecasting analytics.'
              />
            </ProtectedRoute>
          }
        />

        {/* System Routes */}
        <Route
          path='/users'
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/profile'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='User Profile'
                description='Manage your user profile, preferences, and account settings.'
              />
            </ProtectedRoute>
          }
        />
        <Route
          path='/settings'
          element={
            <ProtectedRoute>
              <PlaceholderPage
                title='Application Settings'
                description='Configure application settings, user preferences, and system configurations.'
              />
            </ProtectedRoute>
          }
        />

        {/* Fallback Route */}
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </AnimatePresence>
  );
};
