/**
 * Application constants
 * Following Instructions naming conventions (SCREAMING_SNAKE_CASE)
 */

/**
 * Application metadata
 */
export const APP_CONFIG = {
  NAME: 'Flowlytix',
  COMPANY_NAME: 'Flowlytix',
  COMPANY_BY: 'InnovWelt',
  VERSION: '1.0.0',
  DESCRIPTION: 'Goods Distribution Agency Management System',
  COMPANY: 'InnovWelt',
} as const;

/**
 * Authentication constants
 */
export const AUTH_CONFIG = {
  SESSION_STORAGE_KEY: 'flowlytix_auth_session',
  REMEMBER_ME_STORAGE_KEY: 'flowlytix_remember_me',
  DEFAULT_CREDENTIALS: {
    EMAIL: 'admin@flowlytix.com',
    PASSWORD: 'admin123',
  },
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
} as const;

/**
 * UI constants
 */
export const UI_CONFIG = {
  THEME: {
    PRIMARY_COLOR: '#513ff2',
    SECONDARY_COLOR: '#6b52f5',
    SUCCESS_COLOR: '#10b981',
    ERROR_COLOR: '#ef4444',
    WARNING_COLOR: '#f59e0b',
    INFO_COLOR: '#3b82f6',
    BRAND_GRADIENT: 'linear-gradient(135deg, #513ff2 0%, #6b52f5 100%)',
    LIGHT_PURPLE: '#f8f7ff',
    PURPLE_50: '#faf9ff',
    PURPLE_100: '#f3f1ff',
    PURPLE_500: '#513ff2',
    PURPLE_600: '#4338ca',
    PURPLE_700: '#3730a3',
  },
  BREAKPOINTS: {
    XS: 0,
    SM: 600,
    MD: 900,
    LG: 1200,
    XL: 1536,
  },
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
  },
} as const;

/**
 * Form constants
 */
export const FORM_CONFIG = {
  DEBOUNCE_DELAY: 300,
  MAX_INPUT_LENGTH: {
    EMAIL: 254,
    PASSWORD: 128,
    NAME: 100,
  },
  VALIDATION_DELAY: 500,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  AUTHENTICATION_FAILED: 'Authentication failed. Please check your credentials.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  ELECTRON_API_UNAVAILABLE: 'Application API is not available. Please restart the application.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
} as const;

/**
 * Loading states
 */
export const LOADING_STATES = {
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

/**
 * Accessibility constants
 */
export const A11Y_CONFIG = {
  ARIA_LABELS: {
    LOGIN_FORM: 'Login form',
    EMAIL_INPUT: 'Email address',
    PASSWORD_INPUT: 'Password',
    REMEMBER_ME: 'Remember me',
    SUBMIT_BUTTON: 'Sign in',
    LOGO: 'Flowlytix logo',
    ERROR_MESSAGE: 'Error message',
    SUCCESS_MESSAGE: 'Success message',
  },
  KEYBOARD_SHORTCUTS: {
    SUBMIT: 'Enter',
    ESCAPE: 'Escape',
  },
} as const;
