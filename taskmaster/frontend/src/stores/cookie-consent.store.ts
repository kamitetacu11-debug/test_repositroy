import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { consentApi } from '@/lib/api';

export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface CookiePreferences {
  necessary: boolean; // Always true, required for app to work
  functional: boolean; // User preferences, settings
  analytics: boolean; // Usage analytics
  marketing: boolean; // Marketing/advertising cookies
}

interface CookieConsentState {
  // Unique visitor identifier for database sync
  visitorId: string | null;
  // Whether user has made a choice (accepted or customized)
  hasConsented: boolean;
  // When the consent was given
  consentDate: string | null;
  // User's cookie preferences
  preferences: CookiePreferences;
  // Whether to show the banner
  showBanner: boolean;
  // Whether to show detailed settings modal
  showSettings: boolean;
  // Hydration flag for SSR
  _hasHydrated: boolean;
  // Sync status
  _isSyncing: boolean;

  // Actions
  acceptAll: () => void;
  rejectAll: () => void;
  acceptSelected: (preferences: Partial<CookiePreferences>) => void;
  openSettings: () => void;
  closeSettings: () => void;
  resetConsent: () => void;
  setHasHydrated: (state: boolean) => void;

  // Helpers
  canUseCookie: (category: CookieCategory) => boolean;
}

const defaultPreferences: CookiePreferences = {
  necessary: true, // Always enabled
  functional: false,
  analytics: false,
  marketing: false,
};

// Generate a unique visitor ID
function generateVisitorId(): string {
  // Use a combination of timestamp and random string for uniqueness
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `visitor_${timestamp}_${randomPart}`;
}

// Get or create visitor ID
function getVisitorId(existingId: string | null): string {
  if (existingId) return existingId;
  return generateVisitorId();
}

// Sync consent to database (fire-and-forget, don't block UI)
async function syncToDatabase(visitorId: string, preferences: CookiePreferences): Promise<void> {
  try {
    await consentApi.saveConsent(visitorId, preferences);
  } catch (error) {
    // Log but don't fail - database sync is best-effort
    console.warn('Failed to sync cookie consent to database:', error);
  }
}

export const useCookieConsentStore = create<CookieConsentState>()(
  persist(
    (set, get) => ({
      visitorId: null,
      hasConsented: false,
      consentDate: null,
      preferences: defaultPreferences,
      showBanner: true,
      showSettings: false,
      _hasHydrated: false,
      _isSyncing: false,

      acceptAll: () => {
        const visitorId = getVisitorId(get().visitorId);
        const preferences: CookiePreferences = {
          necessary: true,
          functional: true,
          analytics: true,
          marketing: true,
        };

        set({
          visitorId,
          hasConsented: true,
          consentDate: new Date().toISOString(),
          preferences,
          showBanner: false,
          showSettings: false,
          _isSyncing: true,
        });

        // Sync to database asynchronously
        syncToDatabase(visitorId, preferences).finally(() => {
          set({ _isSyncing: false });
        });
      },

      rejectAll: () => {
        const visitorId = getVisitorId(get().visitorId);
        const preferences: CookiePreferences = {
          necessary: true, // Necessary cookies are always enabled
          functional: false,
          analytics: false,
          marketing: false,
        };

        set({
          visitorId,
          hasConsented: true,
          consentDate: new Date().toISOString(),
          preferences,
          showBanner: false,
          showSettings: false,
          _isSyncing: true,
        });

        // Sync to database asynchronously
        syncToDatabase(visitorId, preferences).finally(() => {
          set({ _isSyncing: false });
        });
      },

      acceptSelected: (newPreferences) => {
        const state = get();
        const visitorId = getVisitorId(state.visitorId);
        const preferences: CookiePreferences = {
          ...state.preferences,
          ...newPreferences,
          necessary: true, // Always keep necessary enabled
        };

        set({
          visitorId,
          hasConsented: true,
          consentDate: new Date().toISOString(),
          preferences,
          showBanner: false,
          showSettings: false,
          _isSyncing: true,
        });

        // Sync to database asynchronously
        syncToDatabase(visitorId, preferences).finally(() => {
          set({ _isSyncing: false });
        });
      },

      openSettings: () => {
        set({ showSettings: true });
      },

      closeSettings: () => {
        set({ showSettings: false });
      },

      resetConsent: () => {
        const visitorId = get().visitorId;

        set({
          hasConsented: false,
          consentDate: null,
          preferences: defaultPreferences,
          showBanner: true,
          showSettings: false,
        });

        // Try to delete from database if we have a visitor ID
        if (visitorId) {
          consentApi.deleteConsent(visitorId).catch((error) => {
            console.warn('Failed to delete cookie consent from database:', error);
          });
        }
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      canUseCookie: (category) => {
        const { hasConsented, preferences } = get();
        // Necessary cookies are always allowed
        if (category === 'necessary') return true;
        // Other categories require consent
        return hasConsented && preferences[category];
      },
    }),
    {
      name: 'cookie-consent-storage',
      onRehydrateStorage: () => (state, error) => {
        // Handle errors - use setTimeout to avoid circular reference
        if (error) {
          console.error('Cookie consent hydration error:', error);
          setTimeout(() => {
            useCookieConsentStore.setState({ _hasHydrated: true, showBanner: true });
          }, 0);
          return;
        }

        // Use setTimeout to ensure store is fully initialized before calling setState
        setTimeout(() => {
          if (state) {
            // If user has already consented, don't show banner
            useCookieConsentStore.setState({
              _hasHydrated: true,
              showBanner: !state.hasConsented,
            });
          } else {
            // Handle fresh store (no localStorage data)
            useCookieConsentStore.setState({ _hasHydrated: true, showBanner: true });
          }
        }, 0);
      },
      partialize: (state) => ({
        visitorId: state.visitorId,
        hasConsented: state.hasConsented,
        consentDate: state.consentDate,
        preferences: state.preferences,
      }),
    }
  )
);
