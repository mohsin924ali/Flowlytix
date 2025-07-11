'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DashboardLayout } from '@/components/templates/DashboardLayout/DashboardLayout';

interface LayoutProviderProps {
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const pathname = usePathname();

  // Pages that should not use the dashboard layout
  const authPages = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  const isAuthPage = authPages.some((page) => pathname.startsWith(page));

  if (isAuthPage) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};
