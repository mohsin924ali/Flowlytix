/**
 * Mock Data Provider
 * React component that initializes the mock system
 */

import React, { useEffect } from 'react';
import { configureMocks } from '../config/mockConfig';

interface MockDataProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const MockDataProvider: React.FC<MockDataProviderProps> = ({ children, enabled = true }) => {
  // Initialize mocks synchronously during render to ensure they're available immediately
  const [mockInitialized, setMockInitialized] = React.useState(false);

  // Initialize mocks immediately on first render
  React.useMemo(() => {
    if (enabled && !mockInitialized) {
      console.log('🎭 MockDataProvider: Initializing mock system synchronously...');
      configureMocks();
      setMockInitialized(true);
      console.log('✅ MockDataProvider: Mock system initialized synchronously');

      // Log agency API availability for debugging
      if (window.electronAPI?.agency) {
        console.log('✅ Agency API is available:', !!window.electronAPI.agency);
        console.log('✅ Agency getAgencies is available:', !!(window.electronAPI.agency as any).getAgencies);
      } else {
        console.warn('⚠️ Agency API not found after mock initialization');
      }
    } else if (!enabled) {
      console.log('⏭️ MockDataProvider: Mock system disabled');
    }
  }, [enabled, mockInitialized]);

  return <>{children}</>;
};
