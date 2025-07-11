'use client';

import React from 'react';
import { Box } from '@mui/material';
import { Navigation } from '@/components/organisms/Navigation/Navigation';

const drawerWidth = 280;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Navigation Sidebar */}
      <Navigation />

      {/* Main Content Area */}
      <Box
        component='main'
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'linear-gradient(135deg, rgba(252, 242, 232, 0.05) 0%, rgba(180, 199, 227, 0.05) 100%)',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
