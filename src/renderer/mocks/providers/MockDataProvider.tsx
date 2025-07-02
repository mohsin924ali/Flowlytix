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
  useEffect(() => {
    if (enabled) {
      console.log('🎭 MockDataProvider: Initializing mock system...');
      configureMocks();
      console.log('✅ MockDataProvider: Mock system initialized');
    } else {
      console.log('⏭️ MockDataProvider: Mock system disabled');
    }
  }, [enabled]);

  return <>{children}</>;
};
