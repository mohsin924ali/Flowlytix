import { createTheme, Theme } from '@mui/material/styles';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

/**
 * RTL Theme Configuration for Urdu Language Support
 * Following Instructions file standards for proper theme management
 */

/**
 * Create RTL-adapted theme
 * @param baseTheme - Base theme configuration
 * @param isRTL - Whether to use RTL direction
 * @returns Theme with RTL adaptations
 */
export const createRTLTheme = (baseTheme: Theme, isRTL: boolean): Theme => {
  return createTheme({
    ...baseTheme,
    direction: isRTL ? 'rtl' : 'ltr',
    components: {
      ...baseTheme.components,

      // MUI CSS Baseline for RTL support
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            direction: isRTL ? 'rtl' : 'ltr',
          },
        },
      },

      // AppBar adaptations for RTL
      MuiAppBar: {
        styleOverrides: {
          root: {
            left: isRTL ? 'auto' : undefined,
            right: isRTL ? 0 : 'auto',
          },
        },
      },

      // Drawer adaptations for RTL
      MuiDrawer: {
        styleOverrides: {
          paper: {
            right: isRTL ? 0 : 'auto',
            left: isRTL ? 'auto' : 0,
          },
        },
      },

      // Menu adaptations for RTL
      MuiMenu: {
        styleOverrides: {
          paper: {
            transformOrigin: isRTL ? 'right top !important' : 'left top !important',
          },
        },
      },

      // Tooltip adaptations for RTL
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            textAlign: isRTL ? 'right' : 'left',
          },
        },
      },

      // Button adaptations for RTL
      MuiButton: {
        styleOverrides: {
          root: {
            textAlign: isRTL ? 'right' : 'left',
            '& .MuiButton-startIcon': {
              marginLeft: isRTL ? '8px' : '-4px',
              marginRight: isRTL ? '-4px' : '8px',
            },
            '& .MuiButton-endIcon': {
              marginLeft: isRTL ? '-4px' : '8px',
              marginRight: isRTL ? '8px' : '-4px',
            },
          },
        },
      },

      // List Item adaptations for RTL
      MuiListItem: {
        styleOverrides: {
          root: {
            paddingLeft: isRTL ? '16px' : '16px',
            paddingRight: isRTL ? '16px' : '16px',
            '& .MuiListItemIcon-root': {
              marginLeft: isRTL ? '16px' : '0',
              marginRight: isRTL ? '0' : '16px',
            },
          },
        },
      },

      // Chip adaptations for RTL
      MuiChip: {
        styleOverrides: {
          root: {
            '& .MuiChip-icon': {
              marginLeft: isRTL ? '8px' : '-8px',
              marginRight: isRTL ? '-8px' : '8px',
            },
            '& .MuiChip-deleteIcon': {
              marginLeft: isRTL ? '-8px' : '8px',
              marginRight: isRTL ? '8px' : '-8px',
            },
          },
        },
      },

      // Input adaptations for RTL
      MuiInputBase: {
        styleOverrides: {
          root: {
            textAlign: isRTL ? 'right' : 'left',
          },
        },
      },

      // TextField adaptations for RTL
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputLabel-root': {
              transformOrigin: isRTL ? 'top right' : 'top left',
              left: isRTL ? 'auto' : 0,
              right: isRTL ? 0 : 'auto',
            },
            '& .MuiInputAdornment-positionStart': {
              marginLeft: isRTL ? '8px' : '0',
              marginRight: isRTL ? '0' : '8px',
            },
            '& .MuiInputAdornment-positionEnd': {
              marginLeft: isRTL ? '0' : '8px',
              marginRight: isRTL ? '8px' : '0',
            },
          },
        },
      },

      // Typography adaptations for RTL
      MuiTypography: {
        styleOverrides: {
          root: {
            textAlign: isRTL ? 'right' : 'left',
          },
        },
      },

      // Table adaptations for RTL
      MuiTableCell: {
        styleOverrides: {
          root: {
            textAlign: isRTL ? 'right' : 'left',
          },
        },
      },

      // Icon Button adaptations for RTL
      MuiIconButton: {
        styleOverrides: {
          root: {
            transform: isRTL ? 'scaleX(-1)' : 'none',
          },
        },
      },

      // Breadcrumbs adaptations for RTL
      MuiBreadcrumbs: {
        styleOverrides: {
          root: {
            '& .MuiBreadcrumbs-separator': {
              transform: isRTL ? 'scaleX(-1)' : 'none',
            },
          },
        },
      },

      // Stepper adaptations for RTL
      MuiStepper: {
        styleOverrides: {
          root: {
            '& .MuiStepConnector-root': {
              left: isRTL ? '0' : 'auto',
              right: isRTL ? 'auto' : '0',
            },
          },
        },
      },
    },
  });
};

/**
 * RTL CSS-in-JS plugin configuration
 */
export const rtlCache = {
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
};

/**
 * LTR CSS-in-JS plugin configuration
 */
export const ltrCache = {
  key: 'muiltr',
  stylisPlugins: [prefixer],
};

/**
 * Utility function to get appropriate cache based on direction
 */
export const getEmotionCache = (isRTL: boolean) => {
  return isRTL ? rtlCache : ltrCache;
};

/**
 * Common RTL-specific styles
 */
export const rtlStyles = {
  // Margin utilities
  marginStart: (value: string | number) => ({
    marginLeft: value,
    marginRight: 0,
    '[dir="rtl"] &': {
      marginLeft: 0,
      marginRight: value,
    },
  }),

  marginEnd: (value: string | number) => ({
    marginLeft: 0,
    marginRight: value,
    '[dir="rtl"] &': {
      marginLeft: value,
      marginRight: 0,
    },
  }),

  // Padding utilities
  paddingStart: (value: string | number) => ({
    paddingLeft: value,
    paddingRight: 0,
    '[dir="rtl"] &': {
      paddingLeft: 0,
      paddingRight: value,
    },
  }),

  paddingEnd: (value: string | number) => ({
    paddingLeft: 0,
    paddingRight: value,
    '[dir="rtl"] &': {
      paddingLeft: value,
      paddingRight: 0,
    },
  }),

  // Position utilities
  left: (value: string | number) => ({
    left: value,
    '[dir="rtl"] &': {
      left: 'auto',
      right: value,
    },
  }),

  right: (value: string | number) => ({
    right: value,
    '[dir="rtl"] &': {
      right: 'auto',
      left: value,
    },
  }),

  // Transform utilities
  translateX: (value: string | number) => ({
    transform: `translateX(${value})`,
    '[dir="rtl"] &': {
      transform: `translateX(-${value})`,
    },
  }),

  // Border utilities
  borderStart: (value: string) => ({
    borderLeft: value,
    '[dir="rtl"] &': {
      borderLeft: 'none',
      borderRight: value,
    },
  }),

  borderEnd: (value: string) => ({
    borderRight: value,
    '[dir="rtl"] &': {
      borderRight: 'none',
      borderLeft: value,
    },
  }),

  // Text alignment
  textStart: {
    textAlign: 'left',
    '[dir="rtl"] &': {
      textAlign: 'right',
    },
  },

  textEnd: {
    textAlign: 'right',
    '[dir="rtl"] &': {
      textAlign: 'left',
    },
  },

  // Float utilities
  floatStart: {
    float: 'left',
    '[dir="rtl"] &': {
      float: 'right',
    },
  },

  floatEnd: {
    float: 'right',
    '[dir="rtl"] &': {
      float: 'left',
    },
  },
};

/**
 * Urdu-specific typography settings
 */
export const urduTypography = {
  fontFamily: [
    // Urdu web fonts
    'Noto Nastaliq Urdu',
    'Jameel Noori Nastaliq',
    'Pak Nastaliq',
    // Fallback fonts
    'Tahoma',
    'Arial',
    'sans-serif',
  ].join(','),

  // Font sizes optimized for Urdu
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    md: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    xxl: '1.5rem', // 24px
  },

  // Line height optimized for Urdu script
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing for Urdu
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
};

/**
 * RTL-specific animation variants
 */
export const rtlAnimations = {
  slideInFromStart: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
  },

  slideInFromEnd: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
  },

  slideOutToStart: {
    initial: { x: 0, opacity: 1 },
    animate: { x: '-100%', opacity: 0 },
    exit: { x: 0, opacity: 1 },
  },

  slideOutToEnd: {
    initial: { x: 0, opacity: 1 },
    animate: { x: '100%', opacity: 0 },
    exit: { x: 0, opacity: 1 },
  },
};

export default {
  createRTLTheme,
  rtlCache,
  ltrCache,
  getEmotionCache,
  rtlStyles,
  urduTypography,
  rtlAnimations,
};
