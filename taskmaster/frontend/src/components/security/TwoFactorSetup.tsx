'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  Copy,
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  Key,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface TwoFactorSetupData {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type SetupStep = 'intro' | 'qrcode' | 'verify' | 'backup' | 'complete';

// ============================================================================
// QR Code Component (using external service)
// ============================================================================

function QRCodeDisplay({ url }: { url: string }) {
  // Use a public QR code API service
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center justify-center p-4 bg-white rounded-xl">
      <img
        src={qrCodeUrl}
        alt="Scan this QR code with your authenticator app"
        className="w-48 h-48"
      />
    </div>
  );
}

// ============================================================================
// Two-Factor Setup Modal
// ============================================================================

export function TwoFactorSetup({ isOpen, onClose, onSuccess }: TwoFactorSetupProps) {
  const [step, setStep] = useState<SetupStep>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Initialize 2FA setup
  const initializeSetup = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/2fa/setup');
      setSetupData(response.data.data);
      setStep('qrcode');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to initialize 2FA setup');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify the setup code
  const verifySetup = useCallback(async () => {
    if (!setupData || verificationCode.length < 6) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/auth/2fa/setup/verify', {
        token: verificationCode,
        secret: setupData.secret,
      });
      setStep('backup');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  }, [setupData, verificationCode]);

  // Copy backup codes to clipboard
  const copyBackupCodes = useCallback(() => {
    if (!setupData) return;

    const codesText = setupData.backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 3000);
  }, [setupData]);

  // Complete setup
  const completeSetup = useCallback(() => {
    setStep('complete');
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  }, [onSuccess, onClose]);

  // Reset state on close
  const handleClose = useCallback(() => {
    setStep('intro');
    setSetupData(null);
    setVerificationCode('');
    setError(null);
    setCopiedBackup(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg rounded-2xl border border-glass-border bg-cosmic-dark overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-glass-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cosmic-purple/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-cosmic-purple" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-400">Secure your account</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-glass-light transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step: Introduction */}
            {step === 'intro' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cosmic-purple/20 flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-cosmic-purple" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Enable 2FA</h3>
                  <p className="text-gray-400">
                    Add an extra layer of security to your account by requiring a verification code
                    in addition to your password.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-glass-light">
                    <Smartphone className="w-5 h-5 text-cosmic-cyan mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Authenticator App Required</p>
                      <p className="text-xs text-gray-400">
                        You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-glass-light">
                    <Key className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Backup Codes</p>
                      <p className="text-xs text-gray-400">
                        You'll receive backup codes in case you lose access to your authenticator.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={initializeSetup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  Begin Setup
                </Button>
              </motion.div>
            )}

            {/* Step: QR Code */}
            {step === 'qrcode' && setupData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
                  <p className="text-sm text-gray-400">
                    Scan this QR code with your authenticator app
                  </p>
                </div>

                <div className="flex justify-center">
                  <QRCodeDisplay url={setupData.otpauthUrl} />
                </div>

                {/* Manual entry */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 text-center">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={setupData.secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigator.clipboard.writeText(setupData.secret)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setStep('verify')}
                >
                  Continue
                </Button>
              </motion.div>
            )}

            {/* Step: Verify */}
            {step === 'verify' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Verify Setup</h3>
                  <p className="text-sm text-gray-400">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                  />

                  <Button
                    className="w-full"
                    onClick={verifySetup}
                    disabled={isLoading || verificationCode.length < 6}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Verify Code
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep('qrcode')}
                  >
                    Back to QR Code
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step: Backup Codes */}
            {step === 'backup' && setupData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Key className="w-6 h-6 text-yellow-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Save Your Backup Codes</h3>
                  <p className="text-sm text-gray-400">
                    These codes can be used to access your account if you lose your authenticator.
                    Each code can only be used once.
                  </p>
                </div>

                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertTitle className="text-yellow-500">Important</AlertTitle>
                  <AlertDescription className="text-gray-300">
                    Store these codes in a safe place. You won't be able to see them again!
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2 p-4 rounded-xl bg-glass-light font-mono text-sm">
                  {setupData.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="p-2 rounded bg-cosmic-dark text-center"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={copyBackupCodes}
                  >
                    {copiedBackup ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-status-success" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Codes
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={completeSetup}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    I've Saved My Codes
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step: Complete */}
            {step === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-status-success/20 flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 text-status-success" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">2FA Enabled!</h3>
                <p className="text-gray-400">
                  Your account is now protected with two-factor authentication.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// 2FA Verification Modal (for login)
// ============================================================================

interface TwoFactorVerifyProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<boolean>;
}

export function TwoFactorVerify({ isOpen, onClose, onVerify }: TwoFactorVerifyProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerify = useCallback(async () => {
    if (code.length < 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = await onVerify(code);
      if (!success) {
        setError('Invalid verification code');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  }, [code, onVerify]);

  const handleClose = useCallback(() => {
    setCode('');
    setError(null);
    setUseBackupCode(false);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md rounded-2xl border border-glass-border bg-cosmic-dark p-6"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-cosmic-purple/20 flex items-center justify-center">
              <Shield className="w-7 h-7 text-cosmic-purple" />
            </div>
            <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
            <p className="text-sm text-gray-400 mt-1">
              {useBackupCode
                ? 'Enter one of your backup codes'
                : 'Enter the code from your authenticator app'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Input
              type="text"
              placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
              value={code}
              onChange={(e) => {
                const value = useBackupCode
                  ? e.target.value.toUpperCase().slice(0, 8)
                  : e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
              }}
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={useBackupCode ? 8 : 6}
            />

            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={isLoading || code.length < (useBackupCode ? 8 : 6)}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Verify
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setCode('');
                setError(null);
              }}
            >
              {useBackupCode ? 'Use authenticator code' : 'Use backup code'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TwoFactorSetup;
