'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, Shield, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCookieConsentStore, CookiePreferences } from '@/stores/cookie-consent.store';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings.store';
import { translations } from '@/lib/translations';

interface CookieCategoryInfo {
  key: keyof CookiePreferences;
  title: string;
  titleRu: string;
  description: string;
  descriptionRu: string;
  required: boolean;
}

const cookieCategories: CookieCategoryInfo[] = [
  {
    key: 'necessary',
    title: 'Necessary',
    titleRu: 'Необходимые',
    description: 'Essential for the website to function properly. Includes authentication, security, and session management.',
    descriptionRu: 'Необходимы для корректной работы сайта. Включают авторизацию, безопасность и управление сессией.',
    required: true,
  },
  {
    key: 'functional',
    title: 'Functional',
    titleRu: 'Функциональные',
    description: 'Remember your preferences and settings to provide a personalized experience.',
    descriptionRu: 'Запоминают ваши настройки и предпочтения для персонализированного опыта.',
    required: false,
  },
  {
    key: 'analytics',
    title: 'Analytics',
    titleRu: 'Аналитические',
    description: 'Help us understand how you use our website to improve user experience.',
    descriptionRu: 'Помогают нам понять, как вы используете сайт, для улучшения пользовательского опыта.',
    required: false,
  },
  {
    key: 'marketing',
    title: 'Marketing',
    titleRu: 'Маркетинговые',
    description: 'Used to deliver relevant advertisements and track campaign effectiveness.',
    descriptionRu: 'Используются для показа релевантной рекламы и отслеживания эффективности кампаний.',
    required: false,
  },
];

export function CookieConsent() {
  const {
    hasConsented,
    showBanner,
    showSettings,
    preferences,
    _hasHydrated,
    acceptAll,
    rejectAll,
    acceptSelected,
    openSettings,
    closeSettings,
  } = useCookieConsentStore();

  const { language } = useSettingsStore();
  const isRussian = language === 'ru';

  const [localPreferences, setLocalPreferences] = useState<CookiePreferences>(preferences);
  const [showDetails, setShowDetails] = useState(false);

  // Sync local preferences with store preferences
  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  // Don't render until hydrated to prevent hydration mismatch
  if (!_hasHydrated) {
    return null;
  }

  // Don't show if user has already consented
  if (hasConsented && !showBanner && !showSettings) {
    return null;
  }

  const handleToggleCategory = (key: keyof CookiePreferences) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies
    setLocalPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSavePreferences = () => {
    acceptSelected(localPreferences);
  };

  const t = {
    title: isRussian ? 'Мы используем файлы cookie' : 'We use cookies',
    description: isRussian
      ? 'Мы используем файлы cookie для обеспечения работы сайта, сохранения вашей авторизации и улучшения вашего опыта. Вы можете настроить свои предпочтения или принять все cookie.'
      : 'We use cookies to ensure the website works properly, keep you logged in, and improve your experience. You can customize your preferences or accept all cookies.',
    acceptAll: isRussian ? 'Принять все' : 'Accept All',
    rejectAll: isRussian ? 'Только необходимые' : 'Necessary Only',
    customize: isRussian ? 'Настроить' : 'Customize',
    savePreferences: isRussian ? 'Сохранить настройки' : 'Save Preferences',
    showDetails: isRussian ? 'Подробнее' : 'Show Details',
    hideDetails: isRussian ? 'Скрыть' : 'Hide Details',
    required: isRussian ? 'Обязательно' : 'Required',
    settingsTitle: isRussian ? 'Настройки cookie' : 'Cookie Settings',
    close: isRussian ? 'Закрыть' : 'Close',
  };

  return (
    <AnimatePresence>
      {/* Main Cookie Banner */}
      {showBanner && !hasConsented && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6"
        >
          <div className="mx-auto max-w-4xl">
            <div className="glass rounded-2xl border border-glass-border/50 p-6 shadow-2xl backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--theme-primary)]/20">
                  <Cookie className="h-6 w-6 text-[var(--theme-primary)]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{t.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{t.description}</p>
                </div>
              </div>

              {/* Details Toggle */}
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-4 flex items-center gap-2 text-sm text-[var(--theme-primary)] hover:underline"
              >
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showDetails ? t.hideDetails : t.showDetails}
              </button>

              {/* Cookie Categories (Expandable) */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-3">
                      {cookieCategories.map((category) => (
                        <div
                          key={category.key}
                          className="flex items-center justify-between rounded-xl bg-glass-light/30 p-4"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {isRussian ? category.titleRu : category.title}
                              </span>
                              {category.required && (
                                <span className="rounded-full bg-[var(--theme-primary)]/20 px-2 py-0.5 text-xs text-[var(--theme-primary)]">
                                  {t.required}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              {isRussian ? category.descriptionRu : category.description}
                            </p>
                          </div>
                          <label className="relative ml-4 inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={localPreferences[category.key]}
                              onChange={() => handleToggleCategory(category.key)}
                              disabled={category.required}
                              className="peer sr-only"
                            />
                            <div
                              className={cn(
                                "h-6 w-11 rounded-full transition-colors",
                                "peer-focus:ring-2 peer-focus:ring-[var(--theme-primary)]/50",
                                localPreferences[category.key]
                                  ? 'bg-[var(--theme-primary)]'
                                  : 'bg-gray-600',
                                category.required && 'opacity-60 cursor-not-allowed'
                              )}
                            >
                              <div
                                className={cn(
                                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                                  localPreferences[category.key] ? 'translate-x-5' : 'translate-x-0.5'
                                )}
                              />
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={acceptAll} className="flex-1 sm:flex-none">
                  <Shield className="mr-2 h-4 w-4" />
                  {t.acceptAll}
                </Button>
                <Button onClick={rejectAll} variant="outline" className="flex-1 sm:flex-none">
                  {t.rejectAll}
                </Button>
                {showDetails && (
                  <Button onClick={handleSavePreferences} variant="secondary" className="flex-1 sm:flex-none">
                    <Settings className="mr-2 h-4 w-4" />
                    {t.savePreferences}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cookie Settings Modal (for later access) */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeSettings}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass w-full max-w-lg rounded-2xl border border-glass-border/50 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-primary)]/20">
                  <Cookie className="h-5 w-5 text-[var(--theme-primary)]" />
                </div>
                <h2 className="text-lg font-semibold text-white">{t.settingsTitle}</h2>
              </div>
              <button
                onClick={closeSettings}
                className="rounded-lg p-2 text-gray-400 hover:bg-glass-light/50 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cookie Categories */}
            <div className="mt-6 space-y-3">
              {cookieCategories.map((category) => (
                <div
                  key={category.key}
                  className="flex items-center justify-between rounded-xl bg-glass-light/30 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {isRussian ? category.titleRu : category.title}
                      </span>
                      {category.required && (
                        <span className="rounded-full bg-[var(--theme-primary)]/20 px-2 py-0.5 text-xs text-[var(--theme-primary)]">
                          {t.required}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {isRussian ? category.descriptionRu : category.description}
                    </p>
                  </div>
                  <label className="relative ml-4 inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={localPreferences[category.key]}
                      onChange={() => handleToggleCategory(category.key)}
                      disabled={category.required}
                      className="peer sr-only"
                    />
                    <div
                      className={cn(
                        "h-6 w-11 rounded-full transition-colors",
                        "peer-focus:ring-2 peer-focus:ring-[var(--theme-primary)]/50",
                        localPreferences[category.key]
                          ? 'bg-[var(--theme-primary)]'
                          : 'bg-gray-600',
                        category.required && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                          localPreferences[category.key] ? 'translate-x-5' : 'translate-x-0.5'
                        )}
                      />
                    </div>
                  </label>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex gap-3">
              <Button onClick={handleSavePreferences} className="flex-1">
                {t.savePreferences}
              </Button>
              <Button onClick={acceptAll} variant="outline">
                {t.acceptAll}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
