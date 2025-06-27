/**
 * Material-UI Theme Configuration
 * Following Instructions standards for design system
 */

import { createTheme, type Theme } from '@mui/material/styles';
import { UI_CONFIG } from '../constants/app.constants';

/**
 * Custom theme configuration
 * Following Material Design principles with brand colors
 */
export const theme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: UI_CONFIG.THEME.PRIMARY_COLOR,
      light: UI_CONFIG.THEME.SECONDARY_COLOR,
      dark: UI_CONFIG.THEME.PURPLE_700,
      contrastText: '#ffffff',
    },
    secondary: {
      main: UI_CONFIG.THEME.SECONDARY_COLOR,
      light: UI_CONFIG.THEME.PURPLE_100,
      dark: UI_CONFIG.THEME.PURPLE_600,
      contrastText: '#ffffff',
    },
    success: {
      main: UI_CONFIG.THEME.SUCCESS_COLOR,
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: UI_CONFIG.THEME.ERROR_COLOR,
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: UI_CONFIG.THEME.WARNING_COLOR,
      light: '#fbbf24',
      dark: '#d97706',
    },
    info: {
      main: UI_CONFIG.THEME.INFO_COLOR,
      light: '#60a5fa',
      dark: '#2563eb',
    },
    background: {
      default: UI_CONFIG.THEME.PURPLE_50,
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  spacing: (factor: number) => `${UI_CONFIG.SPACING.SM * factor}px`,
  breakpoints: {
    values: {
      xs: UI_CONFIG.BREAKPOINTS.XS,
      sm: UI_CONFIG.BREAKPOINTS.SM,
      md: UI_CONFIG.BREAKPOINTS.MD,
      lg: UI_CONFIG.BREAKPOINTS.LG,
      xl: UI_CONFIG.BREAKPOINTS.XL,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    // Button component overrides
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '12px 28px',
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: 'none',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          background: UI_CONFIG.THEME.BRAND_GRADIENT,
          '&:hover': {
            background: `linear-gradient(135deg, ${UI_CONFIG.THEME.PURPLE_600} 0%, ${UI_CONFIG.THEME.PURPLE_700} 100%)`,
            boxShadow: '0 8px 25px rgba(81, 63, 242, 0.3)',
          },
        },
        outlined: {
          borderColor: UI_CONFIG.THEME.PRIMARY_COLOR,
          color: UI_CONFIG.THEME.PRIMARY_COLOR,
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            background: UI_CONFIG.THEME.PURPLE_50,
            borderColor: UI_CONFIG.THEME.PURPLE_600,
          },
        },
      },
    },
    // TextField component overrides
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: UI_CONFIG.THEME.PRIMARY_COLOR,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          },
        },
      },
    },
    // Paper component overrides
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(81, 63, 242, 0.08)',
        },
        elevation1: {
          boxShadow: '0 2px 12px rgba(81, 63, 242, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)',
        },
        elevation2: {
          boxShadow: '0 4px 20px rgba(81, 63, 242, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
        },
        elevation8: {
          boxShadow: '0 12px 40px rgba(81, 63, 242, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    // Alert component overrides
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    // Checkbox component overrides
    MuiCheckbox: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
});

/**
 * Dark theme variant (for future use)
 */
export const darkTheme: Theme = createTheme({
  ...theme,
  palette: {
    ...theme.palette,
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
    },
  },
});
