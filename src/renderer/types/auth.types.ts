/**
 * Authentication-related TypeScript interfaces and types
 * Following strict typing standards from Instructions
 */

/**
 * User entity interface
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
  readonly permissions: string[];
}

/**
 * User roles enumeration
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

/**
 * Authentication response interface
 */
export interface AuthResponse {
  readonly success: boolean;
  readonly data?: {
    readonly user: User;
    readonly token?: string;
  };
  readonly error?: string;
}

/**
 * Authentication state interface
 */
export interface AuthState {
  readonly user: User | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;
}

/**
 * Login form data interface
 */
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

/**
 * Form validation errors interface
 */
export interface FormErrors {
  readonly email?: string;
  readonly password?: string;
  readonly general?: string;
}

/**
 * Authentication actions interface
 */
export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  checkSession: () => Promise<void>;
}

/**
 * Combined auth store interface
 */
export interface AuthStore extends AuthState, AuthActions {}
