'use client';

import { useState, useCallback } from 'react';
import { AlertCircle, Clock, ShieldAlert, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Captcha, CaptchaConfig } from './Captcha';
import { cn } from '@/lib/utils';

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

export interface SecurityErrorHandlerProps {
  error: SecurityError | null;
  onCaptchaVerify?: (token: string) => void;
  onRetry?: () => void;
  className?: string;
}

// ============================================================================
// Security Error Display Component
// ============================================================================

export function SecurityErrorHandler({
  error,
  onCaptchaVerify,
  onRetry,
  className,
}: SecurityErrorHandlerProps) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    onCaptchaVerify?.(token);
  }, [onCaptchaVerify]);

  if (!error) return null;

  // Calculate time remaining for lockout
  const lockoutRemaining = error.lockoutUntil
    ? Math.max(0, new Date(error.lockoutUntil).getTime() - Date.now())
    : 0;

  const formatTimeRemaining = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Rate Limit / Too Many Attempts */}
      {error.code === 'TOO_MANY_ATTEMPTS' && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Too Many Login Attempts</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error.message}</p>
            {lockoutRemaining > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  Please wait {formatTimeRemaining(lockoutRemaining)} before trying again.
                </span>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* CAPTCHA Required */}
      {error.code === 'CAPTCHA_REQUIRED' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Verification Required</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              Please complete the verification below to continue.
              {error.attemptsRemaining !== undefined && (
                <span className="text-muted-foreground">
                  {' '}({error.attemptsRemaining} attempts remaining)
                </span>
              )}
            </p>
            {error.captcha && (
              <Captcha
                config={error.captcha}
                onVerify={handleCaptchaVerify}
                onError={(err) => console.error('CAPTCHA error:', err)}
              />
            )}
            {captchaToken && onRetry && (
              <Button onClick={onRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Continue
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* CAPTCHA Failed */}
      {error.code === 'CAPTCHA_FAILED' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Verification Failed</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>The verification check failed. Please try again.</p>
            {error.captcha && (
              <Captcha
                config={error.captcha}
                onVerify={handleCaptchaVerify}
                onError={(err) => console.error('CAPTCHA error:', err)}
              />
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Rate Limit Exceeded */}
      {error.code === 'RATE_LIMIT_EXCEEDED' && (
        <Alert variant="destructive">
          <Clock className="h-4 w-4" />
          <AlertTitle>Rate Limit Exceeded</AlertTitle>
          <AlertDescription>
            <p>{error.message}</p>
            {error.retryAfter && (
              <p className="text-sm text-muted-foreground mt-2">
                Please wait {error.retryAfter} seconds before trying again.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Access Denied */}
      {error.code === 'ACCESS_DENIED' && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            <p>Your access has been temporarily restricted.</p>
            {error.retryAfter && (
              <p className="text-sm text-muted-foreground mt-2">
                Please try again in {formatTimeRemaining(error.retryAfter * 1000)}.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* IP Blocked */}
      {error.code === 'IP_BLOCKED' && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Connection Blocked</AlertTitle>
          <AlertDescription>
            <p>Your connection has been blocked due to suspicious activity.</p>
            <p className="text-sm text-muted-foreground mt-2">
              If you believe this is an error, please contact support.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Generic Security Error */}
      {!['TOO_MANY_ATTEMPTS', 'CAPTCHA_REQUIRED', 'CAPTCHA_FAILED', 'RATE_LIMIT_EXCEEDED', 'ACCESS_DENIED', 'IP_BLOCKED'].includes(error.code) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Security Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ============================================================================
// Lockout Timer Component
// ============================================================================

interface LockoutTimerProps {
  lockoutUntil: string;
  onExpire?: () => void;
}

export function LockoutTimer({ lockoutUntil, onExpire }: LockoutTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    Math.max(0, new Date(lockoutUntil).getTime() - Date.now())
  );

  useEffect(() => {
    if (timeRemaining <= 0) {
      onExpire?.();
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(lockoutUntil).getTime() - Date.now());
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil, timeRemaining, onExpire]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeRemaining <= 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
      <Clock className="h-5 w-5 text-muted-foreground" />
      <span className="text-lg font-mono">{formatTime(timeRemaining)}</span>
    </div>
  );
}

// ============================================================================
// Hook for Security Error Handling
// ============================================================================

import { useEffect } from 'react';

export function useSecurityErrorHandler() {
  const [securityError, setSecurityError] = useState<SecurityError | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleApiError = useCallback((error: unknown) => {
    // Check if it's an API error response
    const apiError = error as { response?: { data?: { error?: SecurityError } } };
    const secError = apiError?.response?.data?.error;

    if (secError && isSecurityError(secError)) {
      setSecurityError(secError);
      return true;
    }

    setSecurityError(null);
    return false;
  }, []);

  const clearError = useCallback(() => {
    setSecurityError(null);
    setCaptchaToken(null);
  }, []);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  return {
    securityError,
    captchaToken,
    handleApiError,
    clearError,
    handleCaptchaVerify,
    isLocked: securityError?.code === 'TOO_MANY_ATTEMPTS' && !!securityError.lockoutUntil,
    requiresCaptcha: securityError?.requiresCaptcha || securityError?.code === 'CAPTCHA_REQUIRED',
  };
}

function isSecurityError(error: unknown): error is SecurityError {
  if (!error || typeof error !== 'object') return false;

  const e = error as SecurityError;
  return (
    typeof e.code === 'string' &&
    typeof e.message === 'string' &&
    [
      'TOO_MANY_ATTEMPTS',
      'CAPTCHA_REQUIRED',
      'CAPTCHA_FAILED',
      'RATE_LIMIT_EXCEEDED',
      'ACCESS_DENIED',
      'IP_BLOCKED',
    ].includes(e.code)
  );
}
