/**
 * Main App Component
 * Root component with authentication flow and theme provider
 * Following Instructions standards with TypeScript strict mode
 */

import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { theme } from './utils/theme';
import { useAuthStore } from './store/auth.store';
import { LoginPage } from './components/organisms';
import { DashboardPage } from './pages/DashboardPage';

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
 * Main App component
 * Handles authentication state and routing
 */
export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 40,
              height: 40,
              border: '4px solid #e3f2fd',
              borderTop: '4px solid #1976d2',
              borderRadius: '50%',
            }}
          />
        </motion.div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AnimatePresence mode='wait'>
        {isAuthenticated ? (
          <motion.div
            key='dashboard'
            initial='initial'
            animate='in'
            exit='out'
            variants={pageVariants}
            transition={pageTransition}
          >
            <DashboardPage />
          </motion.div>
        ) : (
          <motion.div
            key='login'
            initial='initial'
            animate='in'
            exit='out'
            variants={pageVariants}
            transition={pageTransition}
          >
            <LoginPage showDevMode={true} logoSrc='./assets/images/logo-main.svg' />
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeProvider>
  );
};
