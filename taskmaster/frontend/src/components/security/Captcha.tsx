'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type CaptchaProvider = 'recaptcha' | 'hcaptcha' | 'turnstile' | 'disabled';

export interface CaptchaConfig {
  provider: CaptchaProvider;
  siteKey: string;
}

export interface CaptchaProps {
  config: CaptchaConfig;
  onVerify: (token: string) => void;
  onError?: (error: Error) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact' | 'invisible';
  className?: string;
}

export interface CaptchaRef {
  reset: () => void;
  execute: () => Promise<string>;
}

// ============================================================================
// Script Loading
// ============================================================================

const SCRIPT_URLS: Record<CaptchaProvider, string> = {
  recaptcha: 'https://www.google.com/recaptcha/api.js?render=explicit',
  hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  disabled: '',
};

const loadedScripts = new Set<string>();

function loadScript(provider: CaptchaProvider): Promise<void> {
  const url = SCRIPT_URLS[provider];
  if (!url || loadedScripts.has(url)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      loadedScripts.add(url);
      resolve();
    };

    script.onerror = () => {
      reject(new Error(`Failed to load ${provider} script`));
    };

    document.head.appendChild(script);
  });
}

// ============================================================================
// Captcha Component
// ============================================================================

export function Captcha({
  config,
  onVerify,
  onError,
  onExpire,
  theme = 'light',
  size = 'normal',
  className,
}: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderCaptcha = useCallback(async () => {
    if (!containerRef.current || config.provider === 'disabled') {
      setIsLoading(false);
      return;
    }

    try {
      await loadScript(config.provider);
      setIsLoading(false);

      // Wait for the API to be ready
      await waitForApi(config.provider);

      // Clear any existing widget
      if (widgetIdRef.current !== null) {
        resetWidget(config.provider, widgetIdRef.current);
      }

      // Render the widget
      widgetIdRef.current = renderWidget(config.provider, containerRef.current, {
        sitekey: config.siteKey,
        theme,
        size,
        callback: onVerify,
        'error-callback': () => {
          const err = new Error('CAPTCHA verification failed');
          setError(err.message);
          onError?.(err);
        },
        'expired-callback': () => {
          onExpire?.();
        },
      });
    } catch (err) {
      setIsLoading(false);
      setError((err as Error).message);
      onError?.(err as Error);
    }
  }, [config, theme, size, onVerify, onError, onExpire]);

  useEffect(() => {
    renderCaptcha();

    return () => {
      if (widgetIdRef.current !== null) {
        try {
          resetWidget(config.provider, widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [renderCaptcha, config.provider]);

  if (config.provider === 'disabled') {
    return null;
  }

  return (
    <div className={cn('captcha-container', className)}>
      {isLoading && (
        <div className="flex items-center justify-center h-[78px] bg-muted rounded-md">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive mb-2">
          Failed to load CAPTCHA. Please refresh the page.
        </div>
      )}
      <div
        ref={containerRef}
        className={cn(isLoading && 'hidden')}
      />
    </div>
  );
}

// ============================================================================
// Invisible Captcha Hook
// ============================================================================

export function useInvisibleCaptcha(config: CaptchaConfig) {
  const widgetIdRef = useRef<string | number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  useEffect(() => {
    if (config.provider === 'disabled') return;

    // Create hidden container
    const container = document.createElement('div');
    container.style.display = 'none';
    document.body.appendChild(container);
    containerRef.current = container;

    const init = async () => {
      try {
        await loadScript(config.provider);
        await waitForApi(config.provider);

        widgetIdRef.current = renderWidget(config.provider, container, {
          sitekey: config.siteKey,
          size: 'invisible',
          callback: (token: string) => {
            resolveRef.current?.(token);
          },
          'error-callback': () => {
            rejectRef.current?.(new Error('CAPTCHA verification failed'));
          },
        });
      } catch (err) {
        console.error('Failed to initialize invisible CAPTCHA:', err);
      }
    };

    init();

    return () => {
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
      }
    };
  }, [config]);

  const execute = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (config.provider === 'disabled') {
        resolve('');
        return;
      }

      if (widgetIdRef.current === null) {
        reject(new Error('CAPTCHA not initialized'));
        return;
      }

      resolveRef.current = resolve;
      rejectRef.current = reject;

      executeWidget(config.provider, widgetIdRef.current);
    });
  }, [config.provider]);

  const reset = useCallback(() => {
    if (widgetIdRef.current !== null) {
      resetWidget(config.provider, widgetIdRef.current);
    }
  }, [config.provider]);

  return { execute, reset };
}

// ============================================================================
// Provider-specific Helpers
// ============================================================================

function waitForApi(provider: CaptchaProvider): Promise<void> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      let ready = false;

      switch (provider) {
        case 'recaptcha':
          ready = typeof window.grecaptcha?.render === 'function';
          break;
        case 'hcaptcha':
          ready = typeof window.hcaptcha?.render === 'function';
          break;
        case 'turnstile':
          ready = typeof window.turnstile?.render === 'function';
          break;
      }

      if (ready) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 10000);
  });
}

function renderWidget(
  provider: CaptchaProvider,
  container: HTMLElement,
  options: Record<string, unknown>
): string | number {
  switch (provider) {
    case 'recaptcha':
      return window.grecaptcha.render(container, options);
    case 'hcaptcha':
      return window.hcaptcha.render(container, options);
    case 'turnstile':
      return window.turnstile.render(container, options);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function resetWidget(provider: CaptchaProvider, widgetId: string | number): void {
  switch (provider) {
    case 'recaptcha':
      window.grecaptcha?.reset(widgetId);
      break;
    case 'hcaptcha':
      window.hcaptcha?.reset(widgetId);
      break;
    case 'turnstile':
      window.turnstile?.reset(widgetId);
      break;
  }
}

function executeWidget(provider: CaptchaProvider, widgetId: string | number): void {
  switch (provider) {
    case 'recaptcha':
      window.grecaptcha?.execute(widgetId);
      break;
    case 'hcaptcha':
      window.hcaptcha?.execute(widgetId);
      break;
    case 'turnstile':
      window.turnstile?.execute(widgetId);
      break;
  }
}

// ============================================================================
// Type Declarations
// ============================================================================

declare global {
  interface Window {
    grecaptcha: {
      render: (container: HTMLElement, options: Record<string, unknown>) => number;
      reset: (widgetId: number) => void;
      execute: (widgetId: number) => void;
    };
    hcaptcha: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      execute: (widgetId: string) => void;
    };
    turnstile: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      execute: (widgetId: string) => void;
    };
  }
}
