/**
 * Main App Component
 * Root component with routing and theme provider
 * Following Instructions standards with TypeScript strict mode
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { motion } from 'framer-motion';
import { theme } from './utils/theme';
import { useAuthStore } from './store/auth.store';
import { AppRouter } from './components/routing';

/**
 * Main App component
 * Handles routing with authentication
 */
export const App: React.FC = () => {
  const { isLoading, isAuthenticated, checkSession } = useAuthStore();

  // Check for existing session on app initialization
  React.useEffect(() => {
    console.log('🚀 App initializing - checking session...');
    console.log('🔍 Initial auth state:', JSON.stringify({ isAuthenticated, isLoading }, null, 2));
    checkSession();
  }, [checkSession]);

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
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  );
};
