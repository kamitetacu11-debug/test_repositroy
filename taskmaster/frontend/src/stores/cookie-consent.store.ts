import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CookieCategory = 'necessary' | 'functional' | 'analytics' | 'marketing';

export interface CookiePreferences {
  necessary: boolean; // Always true, required for app to work
  functional: boolean; // User preferences, settings
  analytics: boolean; // Usage analytics
  marketing: boolean; // Marketing/advertising cookies
}

interface CookieConsentState {
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

export const useCookieConsentStore = create<CookieConsentState>()(
  persist(
    (set, get) => ({
      hasConsented: false,
      consentDate: null,
      preferences: defaultPreferences,
      showBanner: true,
      showSettings: false,
      _hasHydrated: false,

      acceptAll: () => {
        set({
          hasConsented: true,
          consentDate: new Date().toISOString(),
          preferences: {
            necessary: true,
            functional: true,
            analytics: true,
            marketing: true,
          },
          showBanner: false,
          showSettings: false,
        });
      },

      rejectAll: () => {
        set({
          hasConsented: true,
          consentDate: new Date().toISOString(),
          preferences: {
            necessary: true, // Necessary cookies are always enabled
            functional: false,
            analytics: false,
            marketing: false,
          },
          showBanner: false,
          showSettings: false,
        });
      },

      acceptSelected: (newPreferences) => {
        set((state) => ({
          hasConsented: true,
          consentDate: new Date().toISOString(),
          preferences: {
            ...state.preferences,
            ...newPreferences,
            necessary: true, // Always keep necessary enabled
          },
          showBanner: false,
          showSettings: false,
        }));
      },

      openSettings: () => {
        set({ showSettings: true });
      },

      closeSettings: () => {
        set({ showSettings: false });
      },

      resetConsent: () => {
        set({
          hasConsented: false,
          consentDate: null,
          preferences: defaultPreferences,
          showBanner: true,
          showSettings: false,
        });
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
        // Handle errors
        if (error) {
          console.error('Cookie consent hydration error:', error);
          useCookieConsentStore.setState({ _hasHydrated: true });
          return;
        }

        if (state) {
          state.setHasHydrated(true);
          // If user has already consented, don't show banner
          if (state.hasConsented) {
            state.showBanner = false;
          }
        } else {
          // Handle fresh store (no localStorage data - e.g., after clearing cookies)
          useCookieConsentStore.setState({ _hasHydrated: true });
        }
      },
      partialize: (state) => ({
        hasConsented: state.hasConsented,
        consentDate: state.consentDate,
        preferences: state.preferences,
      }),
    }
  )
);
