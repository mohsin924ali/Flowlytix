/**
 * SubscriptionStatus Value Object
 * Following Instructions standards with DDD principles
 */

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  GRACE_PERIOD = 'grace_period',
}

/**
 * Subscription Error Types
 * Comprehensive error handling for subscription operations
 */
export enum SubscriptionErrorType {
  // License Key Errors
  INVALID_LICENSE_KEY = 'INVALID_LICENSE_KEY',
  LICENSE_KEY_EXPIRED = 'LICENSE_KEY_EXPIRED',
  LICENSE_KEY_SUSPENDED = 'LICENSE_KEY_SUSPENDED',
  LICENSE_KEY_ALREADY_USED = 'LICENSE_KEY_ALREADY_USED',
  LICENSE_KEY_NOT_FOUND = 'LICENSE_KEY_NOT_FOUND',

  // Device Errors
  DEVICE_LIMIT_EXCEEDED = 'DEVICE_LIMIT_EXCEEDED',
  DEVICE_NOT_AUTHORIZED = 'DEVICE_NOT_AUTHORIZED',
  DEVICE_BLOCKED = 'DEVICE_BLOCKED',

  // Network Errors
  NETWORK_CONNECTION_ERROR = 'NETWORK_CONNECTION_ERROR',
  SERVER_UNREACHABLE = 'SERVER_UNREACHABLE',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',

  // Authentication Errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  CREDENTIALS_INVALID = 'CREDENTIALS_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Subscription Errors
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_SUSPENDED = 'SUBSCRIPTION_SUSPENDED',
  SUBSCRIPTION_DOWNGRADED = 'SUBSCRIPTION_DOWNGRADED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',

  // System Errors
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MALFORMED_REQUEST = 'MALFORMED_REQUEST',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * User-friendly error messages for subscription operations
 */
export const SubscriptionErrorMessages = {
  [SubscriptionErrorType.INVALID_LICENSE_KEY]: {
    title: 'Invalid License Key',
    message: 'The license key you entered is not valid. Please check your license key and try again.',
    suggestions: [
      'Verify you have entered the license key correctly',
      'Check for any missing characters or typos',
      'Contact support if you continue to have issues',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.LICENSE_KEY_EXPIRED]: {
    title: 'License Key Expired',
    message: 'Your license key has expired. Please renew your subscription to continue using the application.',
    suggestions: [
      'Contact your administrator to renew the license',
      'Visit our website to purchase a new license',
      'Check if you have a newer license key available',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.LICENSE_KEY_SUSPENDED]: {
    title: 'License Key Suspended',
    message: 'Your license key has been suspended. Please contact support for assistance.',
    suggestions: [
      'Contact support immediately',
      'Check your email for any suspension notifications',
      'Verify your account status',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.LICENSE_KEY_ALREADY_USED]: {
    title: 'License Key Already in Use',
    message:
      'This license key is already being used on another device. Please use a different license key or contact support.',
    suggestions: [
      'Check if you have multiple license keys',
      'Contact support to transfer the license',
      'Consider upgrading for multiple device support',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.LICENSE_KEY_NOT_FOUND]: {
    title: 'License Key Not Found',
    message: 'The license key you entered was not found in our system. Please check your license key and try again.',
    suggestions: [
      'Verify you have entered the license key correctly',
      'Check if the license key is still valid',
      'Contact support if you continue to have issues',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.DEVICE_LIMIT_EXCEEDED]: {
    title: 'Device Limit Exceeded',
    message: 'You have reached the maximum number of devices allowed for your subscription plan.',
    suggestions: [
      'Upgrade your subscription plan',
      'Remove unused devices from your account',
      'Contact support for assistance',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.DEVICE_NOT_AUTHORIZED]: {
    title: 'Device Not Authorized',
    message: 'This device is not authorized to use this license key.',
    suggestions: [
      'Contact support to authorize this device',
      'Check if you have the correct license key',
      'Verify your account permissions',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.DEVICE_BLOCKED]: {
    title: 'Device Blocked',
    message: 'This device has been blocked from accessing the service.',
    suggestions: [
      'Contact support immediately',
      'Check your email for blocking notifications',
      'Verify your account status',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.NETWORK_CONNECTION_ERROR]: {
    title: 'Connection Error',
    message: 'Unable to connect to the licensing server. Please check your internet connection and try again.',
    suggestions: [
      'Check your internet connection',
      'Try again in a few moments',
      'Contact your network administrator if the problem persists',
    ],
    severity: 'warning' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.SERVER_UNREACHABLE]: {
    title: 'Server Unavailable',
    message: 'The licensing server is temporarily unavailable. Please try again later.',
    suggestions: [
      'Try again in a few minutes',
      'Check our status page for any known issues',
      'Contact support if the problem persists',
    ],
    severity: 'warning' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.REQUEST_TIMEOUT]: {
    title: 'Request Timeout',
    message: 'The request to the licensing server timed out. Please try again.',
    suggestions: ['Try again in a moment', 'Check your internet connection', 'Contact support if the problem persists'],
    severity: 'warning' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.SERVER_ERROR]: {
    title: 'Server Error',
    message: 'The licensing server encountered an error. Please try again later.',
    suggestions: [
      'Try again in a few minutes',
      'Check our status page for any known issues',
      'Contact support if the problem persists',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.AUTHENTICATION_FAILED]: {
    title: 'Authentication Failed',
    message: 'Failed to authenticate with the licensing server. Please check your credentials and try again.',
    suggestions: [
      'Verify your license key is correct',
      'Check your internet connection',
      'Contact support if the problem persists',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.CREDENTIALS_INVALID]: {
    title: 'Invalid Credentials',
    message: 'The credentials you provided are invalid. Please check your license key and try again.',
    suggestions: [
      'Verify your license key is correct',
      'Check for any typos in your license key',
      'Contact support if you continue to have issues',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.SESSION_EXPIRED]: {
    title: 'Session Expired',
    message: 'Your session has expired. Please restart the application and try again.',
    suggestions: [
      'Restart the application',
      'Try activating your license again',
      'Contact support if the problem persists',
    ],
    severity: 'warning' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.SUBSCRIPTION_EXPIRED]: {
    title: 'Subscription Expired',
    message: 'Your subscription has expired. Please renew your subscription to continue using the application.',
    suggestions: [
      'Contact your administrator to renew the subscription',
      'Visit our website to purchase a new subscription',
      'Check if you have a newer license key available',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.SUBSCRIPTION_CANCELLED]: {
    title: 'Subscription Cancelled',
    message: 'Your subscription has been cancelled. Please contact support for assistance.',
    suggestions: [
      'Contact support immediately',
      'Check your email for cancellation notifications',
      'Verify your account status',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.SUBSCRIPTION_SUSPENDED]: {
    title: 'Subscription Suspended',
    message: 'Your subscription has been suspended. Please contact support for assistance.',
    suggestions: [
      'Contact support immediately',
      'Check your email for suspension notifications',
      'Verify your account status',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.SUBSCRIPTION_DOWNGRADED]: {
    title: 'Subscription Downgraded',
    message: 'Your subscription has been downgraded. Some features may no longer be available.',
    suggestions: [
      'Contact support for details',
      'Check your email for downgrade notifications',
      'Consider upgrading your subscription',
    ],
    severity: 'warning' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.FEATURE_NOT_AVAILABLE]: {
    title: 'Feature Not Available',
    message: 'This feature is not available with your current subscription plan.',
    suggestions: ['Upgrade your subscription plan', 'Contact support for more information', 'Check your plan details'],
    severity: 'info' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.API_UNAVAILABLE]: {
    title: 'Service Unavailable',
    message: 'The licensing service is temporarily unavailable. Please restart the application and try again.',
    suggestions: [
      'Restart the application',
      'Check if the application is up to date',
      'Contact support if the problem persists',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.DATABASE_ERROR]: {
    title: 'Database Error',
    message: 'A database error occurred. Please try again later.',
    suggestions: [
      'Try again in a few minutes',
      'Contact support if the problem persists',
      'Check our status page for any known issues',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.STORAGE_ERROR]: {
    title: 'Storage Error',
    message: 'A storage error occurred. Please try again.',
    suggestions: ['Try again in a moment', 'Restart the application', 'Contact support if the problem persists'],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.CONFIGURATION_ERROR]: {
    title: 'Configuration Error',
    message: 'A configuration error occurred. Please contact support.',
    suggestions: [
      'Contact support immediately',
      'Check if the application is up to date',
      'Try restarting the application',
    ],
    severity: 'error' as const,
    recoverable: false,
  },
  [SubscriptionErrorType.VALIDATION_ERROR]: {
    title: 'Validation Error',
    message: 'The information you provided is invalid. Please check your input and try again.',
    suggestions: [
      'Check your license key format',
      'Verify all required fields are filled',
      'Contact support if you continue to have issues',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.MALFORMED_REQUEST]: {
    title: 'Request Error',
    message: 'There was a problem with your request. Please try again.',
    suggestions: ['Try again in a moment', 'Restart the application', 'Contact support if the problem persists'],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.MISSING_REQUIRED_FIELDS]: {
    title: 'Missing Information',
    message: 'Required information is missing. Please provide all required fields.',
    suggestions: [
      'Check that all required fields are filled',
      'Verify your license key is complete',
      'Contact support if you continue to have issues',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
  [SubscriptionErrorType.UNKNOWN_ERROR]: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    suggestions: [
      'Try the operation again',
      'Restart the application',
      'Contact support with details about what you were doing',
    ],
    severity: 'error' as const,
    recoverable: true,
  },
} as const;

/**
 * Helper function to get user-friendly error information
 */
export const getSubscriptionErrorInfo = (errorType: SubscriptionErrorType | string) => {
  const errorKey = errorType as SubscriptionErrorType;
  return SubscriptionErrorMessages[errorKey] || SubscriptionErrorMessages[SubscriptionErrorType.UNKNOWN_ERROR];
};

/**
 * Helper function to parse error from backend response
 */
export const parseSubscriptionError = (error: string | Error): SubscriptionErrorType => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerError = errorMessage.toLowerCase();

  // Network errors
  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return SubscriptionErrorType.NETWORK_CONNECTION_ERROR;
  }
  if (lowerError.includes('timeout')) {
    return SubscriptionErrorType.REQUEST_TIMEOUT;
  }
  if (lowerError.includes('server') || lowerError.includes('503') || lowerError.includes('502')) {
    return SubscriptionErrorType.SERVER_UNREACHABLE;
  }

  // License key errors
  if (lowerError.includes('invalid') && lowerError.includes('license')) {
    return SubscriptionErrorType.INVALID_LICENSE_KEY;
  }
  if (lowerError.includes('expired') && lowerError.includes('license')) {
    return SubscriptionErrorType.LICENSE_KEY_EXPIRED;
  }
  if (lowerError.includes('suspended') && lowerError.includes('license')) {
    return SubscriptionErrorType.LICENSE_KEY_SUSPENDED;
  }
  if (lowerError.includes('already') && lowerError.includes('used')) {
    return SubscriptionErrorType.LICENSE_KEY_ALREADY_USED;
  }
  if (lowerError.includes('not found') && lowerError.includes('license')) {
    return SubscriptionErrorType.LICENSE_KEY_NOT_FOUND;
  }

  // Device errors
  if (lowerError.includes('device') && lowerError.includes('limit')) {
    return SubscriptionErrorType.DEVICE_LIMIT_EXCEEDED;
  }
  if (lowerError.includes('device') && lowerError.includes('not authorized')) {
    return SubscriptionErrorType.DEVICE_NOT_AUTHORIZED;
  }
  if (lowerError.includes('device') && lowerError.includes('blocked')) {
    return SubscriptionErrorType.DEVICE_BLOCKED;
  }

  // Authentication errors
  if (lowerError.includes('authentication') || lowerError.includes('401')) {
    return SubscriptionErrorType.AUTHENTICATION_FAILED;
  }
  if (lowerError.includes('credentials') && lowerError.includes('invalid')) {
    return SubscriptionErrorType.CREDENTIALS_INVALID;
  }
  if (lowerError.includes('session') && lowerError.includes('expired')) {
    return SubscriptionErrorType.SESSION_EXPIRED;
  }

  // Subscription errors
  if (lowerError.includes('subscription') && lowerError.includes('expired')) {
    return SubscriptionErrorType.SUBSCRIPTION_EXPIRED;
  }
  if (lowerError.includes('subscription') && lowerError.includes('cancelled')) {
    return SubscriptionErrorType.SUBSCRIPTION_CANCELLED;
  }
  if (lowerError.includes('subscription') && lowerError.includes('suspended')) {
    return SubscriptionErrorType.SUBSCRIPTION_SUSPENDED;
  }
  if (lowerError.includes('subscription') && lowerError.includes('downgraded')) {
    return SubscriptionErrorType.SUBSCRIPTION_DOWNGRADED;
  }
  if (lowerError.includes('feature') && lowerError.includes('not available')) {
    return SubscriptionErrorType.FEATURE_NOT_AVAILABLE;
  }

  // System errors
  if (lowerError.includes('api') && lowerError.includes('unavailable')) {
    return SubscriptionErrorType.API_UNAVAILABLE;
  }
  if (lowerError.includes('database') && lowerError.includes('error')) {
    return SubscriptionErrorType.DATABASE_ERROR;
  }
  if (lowerError.includes('storage') && lowerError.includes('error')) {
    return SubscriptionErrorType.STORAGE_ERROR;
  }
  if (lowerError.includes('configuration') && lowerError.includes('error')) {
    return SubscriptionErrorType.CONFIGURATION_ERROR;
  }

  // Validation errors
  if (lowerError.includes('validation') && lowerError.includes('error')) {
    return SubscriptionErrorType.VALIDATION_ERROR;
  }
  if (lowerError.includes('malformed') && lowerError.includes('request')) {
    return SubscriptionErrorType.MALFORMED_REQUEST;
  }
  if (lowerError.includes('missing') && lowerError.includes('required fields')) {
    return SubscriptionErrorType.MISSING_REQUIRED_FIELDS;
  }

  // Default to unknown error
  return SubscriptionErrorType.UNKNOWN_ERROR;
};

export class SubscriptionStatusValue {
  private constructor(private readonly status: SubscriptionStatus) {}

  static create(status: SubscriptionStatus): SubscriptionStatusValue {
    if (!Object.values(SubscriptionStatus).includes(status)) {
      throw new Error(`Invalid subscription status: ${status}`);
    }
    return new SubscriptionStatusValue(status);
  }

  static fromString(status: string): SubscriptionStatusValue {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_') as SubscriptionStatus;
    return SubscriptionStatusValue.create(normalizedStatus);
  }

  get value(): SubscriptionStatus {
    return this.status;
  }

  isActive(): boolean {
    return this.status === SubscriptionStatus.ACTIVE;
  }

  isExpired(): boolean {
    return this.status === SubscriptionStatus.EXPIRED;
  }

  isInGracePeriod(): boolean {
    return this.status === SubscriptionStatus.GRACE_PERIOD;
  }

  isCancelled(): boolean {
    return this.status === SubscriptionStatus.CANCELLED;
  }

  isSuspended(): boolean {
    return this.status === SubscriptionStatus.SUSPENDED;
  }

  isPending(): boolean {
    return this.status === SubscriptionStatus.PENDING;
  }

  canUseFeatures(): boolean {
    return this.isActive() || this.isInGracePeriod();
  }

  getDisplayName(): string {
    switch (this.status) {
      case SubscriptionStatus.PENDING:
        return 'Pending Activation';
      case SubscriptionStatus.ACTIVE:
        return 'Active';
      case SubscriptionStatus.EXPIRED:
        return 'Expired';
      case SubscriptionStatus.CANCELLED:
        return 'Cancelled';
      case SubscriptionStatus.SUSPENDED:
        return 'Suspended';
      case SubscriptionStatus.GRACE_PERIOD:
        return 'Grace Period';
      default:
        return 'Unknown';
    }
  }

  getColor(): string {
    switch (this.status) {
      case SubscriptionStatus.ACTIVE:
        return '#4caf50'; // Green
      case SubscriptionStatus.GRACE_PERIOD:
        return '#ff9800'; // Orange
      case SubscriptionStatus.EXPIRED:
        return '#f44336'; // Red
      case SubscriptionStatus.CANCELLED:
        return '#9e9e9e'; // Gray
      case SubscriptionStatus.SUSPENDED:
        return '#ff5722'; // Deep Orange
      case SubscriptionStatus.PENDING:
        return '#2196f3'; // Blue
      default:
        return '#9e9e9e'; // Gray
    }
  }

  equals(other: SubscriptionStatusValue): boolean {
    return this.status === other.status;
  }

  toString(): string {
    return this.status;
  }
}
