/**
 * Validation schemas using Zod
 * Following Instructions standards for input validation
 */

import { z } from 'zod';

/**
 * Email validation schema
 */
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(254, 'Email is too long');

/**
 * Password validation schema
 */
const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

/**
 * Login form validation schema
 */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().default(false),
});

/**
 * Type inference from login schema
 */
export type LoginFormSchema = z.infer<typeof loginFormSchema>;

/**
 * Validation error messages
 */
export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  EMAIL_TOO_LONG: 'Email is too long',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters',
  PASSWORD_TOO_LONG: 'Password is too long',
  GENERAL_ERROR: 'Please check your credentials and try again',
} as const;

/**
 * Validation utility functions
 */
export const validateEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

export const validatePassword = (password: string): boolean => {
  try {
    passwordSchema.parse(password);
    return true;
  } catch {
    return false;
  }
};
