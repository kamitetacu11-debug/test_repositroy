'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import type { CaptchaConfig } from '@/components/security/Captcha';

// ============================================================================
// Types
// ============================================================================

export interface SecurityError {
  code: string;
  message: string;
  lockoutUntil?: string;
  requiresCaptcha?: boolean;
  attemptsRemaining?: number;
  retryAfter?: number;
  captcha?: CaptchaConfig;
}

export interface LoginCredentials {
  email: string;
  password: string;
  captchaToken?: string;
  rememberMe?: boolean;
}

export interface LoginState {
  isLoading: boolean;
  error: string | null;
  securityError: SecurityError | null;
  requiresCaptcha: boolean;
  isLocked: boolean;
  lockoutUntil: Date | null;
  attemptsRemaining: number | null;
  captchaConfig: CaptchaConfig | null;
}

export interface UseSecureLoginReturn extends LoginState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  loginWithCaptcha: (email: string, password: string, captchaToken: string) => Promise<boolean>;
  clearError: () => void;
  setCaptchaToken: (token: string) => void;
  getCaptchaToken: () => string | null;
}

// ============================================================================
// Security Error Codes
// ============================================================================

const SECURITY_ERROR_CODES = [
  'TOO_MANY_ATTEMPTS',
  'CAPTCHA_REQUIRED',
  'CAPTCHA_FAILED',
  'RATE_LIMIT_EXCEEDED',
  'ACCESS_DENIED',
  'IP_BLOCKED',
  'ACCOUNT_LOCKED',
];

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSecureLogin(): UseSecureLoginReturn {
  const router = useRouter();
  const setAuth = useAuthStore((state) => ({
    setUser: (user: any, token: string) => {
      useAuthStore.setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      localStorage.setItem('token', token);
    },
  }));

  const [state, setState] = useState<LoginState>({
    isLoading: false,
    error: null,
    securityError: null,
    requiresCaptcha: false,
    isLocked: false,
    lockoutUntil: null,
    attemptsRemaining: null,
    captchaConfig: null,
  });

  const captchaTokenRef = useRef<string | null>(null);

  /**
   * Set CAPTCHA token for next login attempt
   */
  const setCaptchaToken = useCallback((token: string) => {
    captchaTokenRef.current = token;
  }, []);

  /**
   * Get current CAPTCHA token
   */
  const getCaptchaToken = useCallback(() => {
    return captchaTokenRef.current;
  }, []);

  /**
   * Clear all errors
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
      securityError: null,
    }));
  }, []);

  /**
   * Parse API error response
   */
  const parseApiError = useCallback((error: AxiosError): {
    isSecurityError: boolean;
    securityError: SecurityError | null;
    message: string;
  } => {
    const data = error.response?.data as { error?: SecurityError } | undefined;
    const errorData = data?.error;

    if (errorData && SECURITY_ERROR_CODES.includes(errorData.code)) {
      return {
        isSecurityError: true,
        securityError: errorData,
        message: errorData.message,
      };
    }

    return {
      isSecurityError: false,
      securityError: null,
      message: errorData?.message || 'Login failed. Please try again.',
    };
  }, []);

  /**
   * Main login function
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      securityError: null,
    }));

    try {
      // Include captcha token if available
      const payload: LoginCredentials = {
        email: credentials.email,
        password: credentials.password,
      };

      if (credentials.captchaToken || captchaTokenRef.current) {
        payload.captchaToken = credentials.captchaToken || captchaTokenRef.current || undefined;
      }

      const response = await api.post('/auth/login', payload);
      const { user, token } = response.data.data;

      // Clear captcha token after successful login
      captchaTokenRef.current = null;

      // Handle remember me
      if (credentials.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedEmail', credentials.email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedEmail');
      }

      // Update auth store
      setAuth.setUser(user, token);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        securityError: null,
        requiresCaptcha: false,
        isLocked: false,
        lockoutUntil: null,
        attemptsRemaining: null,
        captchaConfig: null,
      }));

      // Navigate to dashboard
      router.push('/dashboard');
      return true;
    } catch (err) {
      const axiosError = err as AxiosError;
      const { isSecurityError, securityError, message } = parseApiError(axiosError);

      if (isSecurityError && securityError) {
        // Handle security-specific errors
        const lockoutUntil = securityError.lockoutUntil
          ? new Date(securityError.lockoutUntil)
          : null;

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          securityError,
          requiresCaptcha: securityError.requiresCaptcha || securityError.code === 'CAPTCHA_REQUIRED',
          isLocked: securityError.code === 'TOO_MANY_ATTEMPTS' && !!lockoutUntil,
          lockoutUntil,
          attemptsRemaining: securityError.attemptsRemaining ?? null,
          captchaConfig: securityError.captcha || null,
        }));
      } else {
        // Handle regular errors
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          securityError: null,
        }));
      }

      return false;
    }
  }, [router, setAuth, parseApiError]);

  /**
   * Login with CAPTCHA token
   */
  const loginWithCaptcha = useCallback(async (
    email: string,
    password: string,
    captchaToken: string
  ): Promise<boolean> => {
    return login({ email, password, captchaToken });
  }, [login]);

  return {
    ...state,
    login,
    loginWithCaptcha,
    clearError,
    setCaptchaToken,
    getCaptchaToken,
  };
}

// ============================================================================
// Lockout Timer Hook
// ============================================================================

export function useLockoutTimer(lockoutUntil: Date | null, onExpire?: () => void) {
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (!lockoutUntil) return 0;
    return Math.max(0, lockoutUntil.getTime() - Date.now());
  });

  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Update timer
  useState(() => {
    if (!lockoutUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, lockoutUntil.getTime() - Date.now());
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  });

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isExpired: timeRemaining <= 0,
  };
}

export default useSecureLogin;
