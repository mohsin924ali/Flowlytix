/**
 * Material-UI Theme Configuration
 * Professional theme for Flowlytix Dashboard
 * Following Instructions file standards with comprehensive design system
 */

import { createTheme } from '@mui/material/styles';
import { Inter } from 'next/font/google';

// Load Inter font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Helvetica', 'Arial', 'sans-serif'],
});

// Brand colors based on Flowlytix design system
const brandColors = {
  primary: {
    50: '#f0f0ff',
    100: '#e6e6ff',
    200: '#d1d1ff',
    300: '#b3b3ff',
    400: '#9191ff',
    500: '#513ff2', // Primary brand color
    600: '#4a38db',
    700: '#3d2fb8',
    800: '#312695',
    900: '#251e72',
  },
  secondary: {
    50: '#f8f9ff',
    100: '#f1f4ff',
    200: '#e3e9ff',
    300: '#d1dcff',
    400: '#beccff',
    500: '#6b52f5', // Secondary brand color
    600: '#614ade',
    700: '#5140ba',
    800: '#413696',
    900: '#312b72',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
};

// Create the theme
export const theme = createTheme({
  palette: {
    primary: {
      main: brandColors.primary[500],
      light: brandColors.primary[300],
      dark: brandColors.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandColors.secondary[500],
      light: brandColors.secondary[300],
      dark: brandColors.secondary[700],
      contrastText: '#ffffff',
    },
    error: {
      main: brandColors.error[500],
      light: brandColors.error[300],
      dark: brandColors.error[700],
      contrastText: '#ffffff',
    },
    warning: {
      main: brandColors.warning[500],
      light: brandColors.warning[300],
      dark: brandColors.warning[700],
      contrastText: '#ffffff',
    },
    success: {
      main: brandColors.success[500],
      light: brandColors.success[300],
      dark: brandColors.success[700],
      contrastText: '#ffffff',
    },
    grey: brandColors.neutral,
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: brandColors.neutral[900],
      secondary: brandColors.neutral[600],
      disabled: brandColors.neutral[400],
    },
  },
  typography: {
    fontFamily: inter.style.fontFamily,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.025em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: '-0.025em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: brandColors.neutral[700],
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: brandColors.neutral[600],
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
      color: brandColors.neutral[500],
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${brandColors.primary[500]} 0%, ${brandColors.secondary[500]} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${brandColors.primary[600]} 0%, ${brandColors.secondary[600]} 100%)`,
          },
        },
        outlined: {
          borderColor: brandColors.primary[500],
          color: brandColors.primary[500],
          '&:hover': {
            borderColor: brandColors.primary[600],
            backgroundColor: brandColors.primary[50],
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: `1px solid ${brandColors.neutral[200]}`,
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.neutral[50],
          '& .MuiTableCell-head': {
            fontWeight: 600,
            fontSize: '0.875rem',
            color: brandColors.neutral[700],
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: brandColors.primary[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: brandColors.primary[500],
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: brandColors.neutral[900],
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderBottom: `1px solid ${brandColors.neutral[200]}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: `1px solid ${brandColors.neutral[200]}`,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
});

// Export brand colors for use in components
export { brandColors };
