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
      contrastText: '#ffffff',
    },
    secondary: {
      main: UI_CONFIG.THEME.SECONDARY_COLOR,
      contrastText: '#ffffff',
    },
    success: {
      main: UI_CONFIG.THEME.SUCCESS_COLOR,
    },
    error: {
      main: UI_CONFIG.THEME.ERROR_COLOR,
    },
    warning: {
      main: UI_CONFIG.THEME.WARNING_COLOR,
    },
    info: {
      main: UI_CONFIG.THEME.INFO_COLOR,
    },
    background: {
      default: '#fafafa',
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
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
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
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        },
        elevation8: {
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
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
