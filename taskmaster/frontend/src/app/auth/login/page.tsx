'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Rocket,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSecureLogin } from '@/hooks/useSecureLogin';
import { Captcha } from '@/components/security/Captcha';

// ============================================================================
// Schema
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

// ============================================================================
// Lockout Timer Component
// ============================================================================

function LockoutCountdown({
  lockoutUntil,
  onExpire,
}: {
  lockoutUntil: Date;
  onExpire: () => void;
}) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    Math.max(0, lockoutUntil.getTime() - Date.now())
  );

  useEffect(() => {
    if (timeRemaining <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, lockoutUntil.getTime() - Date.now());
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil, onExpire, timeRemaining]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-6 bg-status-error/10 rounded-xl border border-status-error/30"
    >
      <ShieldAlert className="w-12 h-12 text-status-error mb-4" />
      <h3 className="text-lg font-semibold text-status-error mb-2">Account Temporarily Locked</h3>
      <p className="text-sm text-gray-400 text-center mb-4">
        Too many failed login attempts. Please wait before trying again.
      </p>
      <div className="flex items-center gap-2 text-2xl font-mono text-white bg-cosmic-dark/50 px-6 py-3 rounded-lg">
        <Clock className="w-6 h-6 text-status-error" />
        <span>{formatTime(timeRemaining)}</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Security Alert Component
// ============================================================================

function SecurityAlert({
  code,
  message,
  attemptsRemaining,
}: {
  code: string;
  message: string;
  attemptsRemaining?: number | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Alert className="border-status-warning/50 bg-status-warning/10">
        <AlertCircle className="h-4 w-4 text-status-warning" />
        <AlertTitle className="text-status-warning">
          {code === 'CAPTCHA_REQUIRED' ? 'Verification Required' : 'Security Alert'}
        </AlertTitle>
        <AlertDescription className="space-y-1 text-gray-300">
          <p>{message}</p>
          {attemptsRemaining !== undefined && attemptsRemaining !== null && (
            <p className="text-sm opacity-75">
              {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
            </p>
          )}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}

// ============================================================================
// Main Login Page
// ============================================================================

export default function LoginPage() {
  const {
    isLoading,
    error,
    securityError,
    requiresCaptcha,
    isLocked,
    lockoutUntil,
    attemptsRemaining,
    captchaConfig,
    login,
    loginWithCaptcha,
    clearError,
    setCaptchaToken,
  } = useSecureLogin();

  const [captchaToken, setLocalCaptchaToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Load remembered email on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
      const savedEmail = localStorage.getItem('rememberedEmail');

      if (savedRememberMe && savedEmail) {
        setValue('email', savedEmail);
        setRememberMe(true);
      }
    }
  }, [setValue]);

  // Show CAPTCHA when required
  useEffect(() => {
    if (requiresCaptcha && captchaConfig) {
      setShowCaptcha(true);
    }
  }, [requiresCaptcha, captchaConfig]);

  // Handle CAPTCHA verification
  const handleCaptchaVerify = useCallback((token: string) => {
    setLocalCaptchaToken(token);
    setCaptchaToken(token);
  }, [setCaptchaToken]);

  // Handle form submit
  const onSubmit = useCallback(async (data: LoginForm) => {
    clearError();

    if (captchaToken) {
      await loginWithCaptcha(data.email, data.password, captchaToken);
      setLocalCaptchaToken(null);
      setShowCaptcha(false);
    } else {
      await login({ email: data.email, password: data.password, rememberMe });
    }
  }, [login, loginWithCaptcha, captchaToken, clearError, rememberMe]);

  // Handle lockout expiry
  const handleLockoutExpire = useCallback(() => {
    clearError();
  }, [clearError]);

  // Determine if form should be disabled
  const isFormDisabled = isLoading || isLocked;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-heavy">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-cosmic-purple/20 flex items-center justify-center">
                <Rocket className="w-8 h-8 text-cosmic-purple" />
              </div>
            </div>
            <CardTitle className="text-2xl gradient-text">Welcome Back</CardTitle>
            <CardDescription>Sign in to continue to TaskMaster</CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {/* Lockout State */}
              {isLocked && lockoutUntil && (
                <LockoutCountdown
                  lockoutUntil={lockoutUntil}
                  onExpire={handleLockoutExpire}
                />
              )}

              {/* Normal Login Form */}
              {!isLocked && (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Regular Error */}
                    {error && !securityError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-status-error/20 border border-status-error/50 text-status-error text-sm"
                      >
                        {error}
                      </motion.div>
                    )}

                    {/* Security Error */}
                    {securityError && !isLocked && (
                      <SecurityAlert
                        code={securityError.code}
                        message={securityError.message}
                        attemptsRemaining={attemptsRemaining}
                      />
                    )}

                    {/* Email Field */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <Input
                          {...register('email')}
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          disabled={isFormDisabled}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-status-error text-sm">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <Input
                          {...register('password')}
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          disabled={isFormDisabled}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-status-error text-sm">{errors.password.message}</p>
                      )}
                    </div>

                    {/* CAPTCHA Widget */}
                    <AnimatePresence>
                      {showCaptcha && captchaConfig && captchaConfig.provider !== 'disabled' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 bg-cosmic-dark/30 rounded-xl border border-glass-border">
                            <p className="text-sm text-gray-400 mb-3">
                              Please complete the verification to continue
                            </p>
                            <Captcha
                              config={captchaConfig}
                              onVerify={handleCaptchaVerify}
                              onError={(err) => console.error('CAPTCHA error:', err)}
                              theme="dark"
                            />
                            {captchaToken && (
                              <div className="mt-3 flex items-center gap-2 text-sm text-status-success">
                                <CheckCircle className="w-4 h-4" />
                                Verification complete
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between">
                      <label className="group flex items-center gap-3 text-sm text-gray-400 cursor-pointer select-none">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={isFormDisabled}
                            className="peer sr-only"
                          />
                          <div className="w-5 h-5 rounded-md border-2 border-gray-600 bg-cosmic-dark/50
                            peer-checked:bg-cosmic-purple peer-checked:border-cosmic-purple
                            peer-focus:ring-2 peer-focus:ring-cosmic-purple/50 peer-focus:ring-offset-2 peer-focus:ring-offset-cosmic-darker
                            peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
                            transition-all duration-200 ease-in-out
                            group-hover:border-cosmic-purple/70"
                          >
                            <motion.svg
                              className="w-full h-full text-white p-0.5"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={false}
                              animate={{
                                opacity: rememberMe ? 1 : 0,
                                scale: rememberMe ? 1 : 0.5
                              }}
                              transition={{ duration: 0.15 }}
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </motion.svg>
                          </div>
                        </div>
                        <span className="group-hover:text-gray-300 transition-colors">Remember me</span>
                      </label>
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm text-cosmic-purple hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isFormDisabled || (requiresCaptcha && !captchaToken)}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : requiresCaptcha && !captchaToken ? (
                        <>
                          <ShieldAlert className="mr-2 w-5 h-5" />
                          Complete Verification
                        </>
                      ) : captchaToken ? (
                        <>
                          <RefreshCw className="mr-2 w-5 h-5" />
                          Continue
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Register Link */}
                  <div className="mt-6 text-center text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link href="/auth/register" className="text-cosmic-purple hover:underline">
                      Sign up
                    </Link>
                  </div>

                  {/* Demo Credentials */}
                  <div className="mt-6">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-glass-border" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-cosmic-darker text-gray-400">Demo credentials</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-sm text-gray-500">
                      <p>admin@taskmaster.io / admin123</p>
                      <p>john@taskmaster.io / demo123</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Security Notice */}
        {(requiresCaptcha || isLocked) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center text-xs text-gray-500"
          >
            <ShieldAlert className="inline-block w-3 h-3 mr-1" />
            Protected by TaskMaster Security
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
