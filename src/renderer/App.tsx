/**
 * Main App Component - FINAL: Simple Initialization
 * Root component with routing and theme provider
 * Following Instructions standards with TypeScript strict mode
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { motion } from 'framer-motion';
import { theme } from './utils/theme';
import { MockDataProvider } from './mocks';
import { useAuthStore } from './store/auth.store';
import { AppRouter } from './components/routing';
import { LanguageProvider } from './contexts/LanguageContext';

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
 * Main App component with SIMPLE initialization
 */
export const App: React.FC = () => {
  const { checkSession } = useAuthStore();
  const [initComplete, setInitComplete] = React.useState(false);

  // SIMPLE initialization - no complex timeouts or Promise.race
  React.useEffect(() => {
    console.log('🚀 App initializing with simple approach...');

    // Hide the HTML loading screen immediately
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
      console.log('✅ HTML loading screen hidden');
    }

    const initializeApp = async () => {
      try {
        console.log('🔍 Starting session check...');
        await checkSession();
        console.log('✅ Session check completed');
      } catch (error) {
        console.log('⚠️ Session check failed (continuing anyway):', error);
      } finally {
        // Always complete initialization
        setInitComplete(true);
        console.log('🎯 App initialization complete');
      }
    };

    // Simple timeout to ensure we never hang
    const timeoutId = setTimeout(() => {
      console.log('⏰ Fallback timeout - forcing initialization complete');
      setInitComplete(true);
    }, 2000);

    initializeApp().finally(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, [checkSession]);

  // Show simple loading only briefly during initialization
  if (!initComplete) {
    console.log('⏳ App: Still initializing...');
    return (
      <LanguageProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LoadingScreen />
        </ThemeProvider>
      </LanguageProvider>
    );
  }

  console.log('✅ App: Rendering main application');

  return (
    <LanguageProvider>
      <MockDataProvider enabled={true}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ThemeProvider>
      </MockDataProvider>
    </LanguageProvider>
  );
};
