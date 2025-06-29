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
 * Loading component optimized for performance
 */
const LoadingScreen = React.memo(() => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      gap: '20px',
    }}
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      style={{
        width: 40,
        height: 40,
        border: '4px solid #e3f2fd',
        borderTop: '4px solid #513ff2',
        borderRadius: '50%',
      }}
    />
    <div style={{ textAlign: 'center', color: '#666' }}>
      <div>Initializing Flowlytix...</div>
    </div>
  </motion.div>
));

LoadingScreen.displayName = 'LoadingScreen';

/**
 * Main App component
 * Handles routing with authentication
 */
export const App: React.FC = () => {
  const { isLoading, checkSession } = useAuthStore();
  const [initComplete, setInitComplete] = React.useState(false);

  // Check for existing session on app initialization
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 App initializing - checking session...');
    }

    // Reduced timeout for better perceived performance
    const safetyTimeout = setTimeout(() => {
      setInitComplete(true);
    }, 2000); // 2 second absolute maximum

    // Call checkSession with timeout
    const initializeApp = async () => {
      try {
        await checkSession();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ App: Session check failed:', error);
        }
      } finally {
        clearTimeout(safetyTimeout);
        setInitComplete(true);
      }
    };

    initializeApp();

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [checkSession]);

  // Show loading state only while initializing and not yet complete
  if (!initComplete || (isLoading && !initComplete)) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingScreen />
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
