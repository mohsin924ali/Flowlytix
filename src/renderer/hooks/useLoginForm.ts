/**
 * Custom hook for login form handling
 * Using React Hook Form with Zod validation
 * Following Instructions standards for form handling
 */

import {
  useForm,
  type UseFormRegister,
  type UseFormHandleSubmit,
  type FormState,
  type UseFormWatch,
  type UseFormSetValue,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { loginFormSchema, type LoginFormSchema } from '../utils/validation.schemas';
import { useAuthActions, useAuthState } from '../store/auth.store';
import { AUTH_CONFIG } from '../constants/app.constants';
import type { LoginCredentials } from '../types/auth.types';

/**
 * Login form hook return type
 */
export interface UseLoginFormReturn {
  // Form state
  register: UseFormRegister<LoginFormSchema>;
  handleSubmit: UseFormHandleSubmit<LoginFormSchema>;
  formState: FormState<LoginFormSchema>;
  watch: UseFormWatch<LoginFormSchema>;
  setValue: UseFormSetValue<LoginFormSchema>;

  // Form actions
  onSubmit: (data: LoginFormSchema) => Promise<void>;
  clearError: () => void;

  // Auth state
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
}

/**
 * Custom hook for login form management
 */
export const useLoginForm = (): UseLoginFormReturn => {
  const { login, clearError: clearAuthError } = useAuthActions();
  const { isLoading, error } = useAuthState();

  // Initialize form with React Hook Form and Zod validation
  const { register, handleSubmit, formState, watch, setValue, clearErrors } = useForm<LoginFormSchema>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: AUTH_CONFIG.DEFAULT_CREDENTIALS.EMAIL,
      password: AUTH_CONFIG.DEFAULT_CREDENTIALS.PASSWORD,
      rememberMe: false,
    },
    mode: 'onBlur', // Validate on blur for better UX
  });

  /**
   * Handle form submission
   */
  const onSubmit = useCallback(
    async (data: LoginFormSchema): Promise<void> => {
      try {
        clearAuthError();
        clearErrors();

        const credentials: LoginCredentials = {
          email: data.email,
          password: data.password,
        };

        await login(credentials);

        // Log successful login attempt
        console.log('🔍 Login attempt completed successfully');

        // Handle remember me functionality
        if (data.rememberMe) {
          localStorage.setItem(
            AUTH_CONFIG.REMEMBER_ME_STORAGE_KEY,
            JSON.stringify({
              email: data.email,
              timestamp: Date.now(),
            })
          );
        } else {
          localStorage.removeItem(AUTH_CONFIG.REMEMBER_ME_STORAGE_KEY);
        }
      } catch (error) {
        // Error is already handled by the store
        console.error('Login form submission error:', error);
      }
    },
    [login, clearAuthError, clearErrors]
  );

  /**
   * Clear form and auth errors
   */
  const clearError = useCallback((): void => {
    clearAuthError();
    clearErrors();
  }, [clearAuthError, clearErrors]);

  /**
   * Load remembered credentials on mount
   */
  useEffect(() => {
    try {
      const rememberedData = localStorage.getItem(AUTH_CONFIG.REMEMBER_ME_STORAGE_KEY);
      if (rememberedData) {
        const { email, timestamp } = JSON.parse(rememberedData);

        // Check if remembered data is not too old (30 days)
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < thirtyDaysInMs) {
          setValue('email', email);
          setValue('rememberMe', true);
        } else {
          localStorage.removeItem(AUTH_CONFIG.REMEMBER_ME_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading remembered credentials:', error);
    }
  }, [setValue]);

  /**
   * Clear errors when user starts typing
   */
  useEffect(() => {
    const subscription = watch(() => {
      if (error) {
        clearAuthError();
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, error, clearAuthError]);

  return {
    // Form state
    register,
    handleSubmit,
    formState,
    watch,
    setValue,

    // Form actions
    onSubmit,
    clearError,

    // Auth state
    isLoading,
    error,
    isSubmitting: formState.isSubmitting,
  };
};
