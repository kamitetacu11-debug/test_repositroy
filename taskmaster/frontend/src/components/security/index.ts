/**
 * Security Components
 *
 * This module exports React components for handling security-related
 * functionality in the frontend, including CAPTCHA and error handling.
 */

export {
  Captcha,
  useInvisibleCaptcha,
  type CaptchaConfig,
  type CaptchaProps,
  type CaptchaProvider,
} from './Captcha';

export {
  SecurityErrorHandler,
  LockoutTimer,
  useSecurityErrorHandler,
  type SecurityError,
  type SecurityErrorHandlerProps,
} from './SecurityErrorHandler';
