import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usersApi } from '@/lib/api';

export type Theme = 'cosmic-dark' | 'ocean-blue' | 'forest-green' | 'sunset-orange' | 'aurora-purple' | 'midnight-black' | 'soft-slate' | 'warm-sepia' | 'minimal-gray' | 'gentle-lavender';

export type Language = 'en' | 'ru' | 'zh';

export interface TimezoneConfig {
  id: string;
  name: string;
  offset: string;
  region: string;
}

// Comprehensive timezone list from America to Australia including Russia, China, etc.
export const timezones: TimezoneConfig[] = [
  // Auto-detect option
  { id: 'auto', name: 'Auto-detect', offset: '', region: 'auto' },

  // Americas
  { id: 'America/Adak', name: 'Hawaii-Aleutian (Adak)', offset: 'UTC-10:00', region: 'Americas' },
  { id: 'America/Anchorage', name: 'Alaska', offset: 'UTC-9:00', region: 'Americas' },
  { id: 'America/Los_Angeles', name: 'Pacific Time (Los Angeles)', offset: 'UTC-8:00', region: 'Americas' },
  { id: 'America/Denver', name: 'Mountain Time (Denver)', offset: 'UTC-7:00', region: 'Americas' },
  { id: 'America/Phoenix', name: 'Arizona (Phoenix)', offset: 'UTC-7:00', region: 'Americas' },
  { id: 'America/Chicago', name: 'Central Time (Chicago)', offset: 'UTC-6:00', region: 'Americas' },
  { id: 'America/New_York', name: 'Eastern Time (New York)', offset: 'UTC-5:00', region: 'Americas' },
  { id: 'America/Toronto', name: 'Eastern Time (Toronto)', offset: 'UTC-5:00', region: 'Americas' },
  { id: 'America/Sao_Paulo', name: 'Brasília (São Paulo)', offset: 'UTC-3:00', region: 'Americas' },
  { id: 'America/Buenos_Aires', name: 'Argentina (Buenos Aires)', offset: 'UTC-3:00', region: 'Americas' },

  // Europe
  { id: 'Atlantic/Reykjavik', name: 'Iceland (Reykjavík)', offset: 'UTC+0:00', region: 'Europe' },
  { id: 'Europe/London', name: 'UK (London)', offset: 'UTC+0:00', region: 'Europe' },
  { id: 'Europe/Paris', name: 'Central Europe (Paris)', offset: 'UTC+1:00', region: 'Europe' },
  { id: 'Europe/Berlin', name: 'Central Europe (Berlin)', offset: 'UTC+1:00', region: 'Europe' },
  { id: 'Europe/Helsinki', name: 'Eastern Europe (Helsinki)', offset: 'UTC+2:00', region: 'Europe' },
  { id: 'Europe/Istanbul', name: 'Turkey (Istanbul)', offset: 'UTC+3:00', region: 'Europe' },

  // Russia (all timezones)
  { id: 'Europe/Kaliningrad', name: 'Калининград (UTC+2)', offset: 'UTC+2:00', region: 'Russia' },
  { id: 'Europe/Moscow', name: 'Москва (UTC+3)', offset: 'UTC+3:00', region: 'Russia' },
  { id: 'Europe/Samara', name: 'Самара (UTC+4)', offset: 'UTC+4:00', region: 'Russia' },
  { id: 'Asia/Yekaterinburg', name: 'Екатеринбург (UTC+5)', offset: 'UTC+5:00', region: 'Russia' },
  { id: 'Asia/Omsk', name: 'Омск (UTC+6)', offset: 'UTC+6:00', region: 'Russia' },
  { id: 'Asia/Krasnoyarsk', name: 'Красноярск (UTC+7)', offset: 'UTC+7:00', region: 'Russia' },
  { id: 'Asia/Irkutsk', name: 'Иркутск (UTC+8)', offset: 'UTC+8:00', region: 'Russia' },
  { id: 'Asia/Yakutsk', name: 'Якутск (UTC+9)', offset: 'UTC+9:00', region: 'Russia' },
  { id: 'Asia/Vladivostok', name: 'Владивосток (UTC+10)', offset: 'UTC+10:00', region: 'Russia' },
  { id: 'Asia/Magadan', name: 'Магадан (UTC+11)', offset: 'UTC+11:00', region: 'Russia' },
  { id: 'Asia/Kamchatka', name: 'Камчатка (UTC+12)', offset: 'UTC+12:00', region: 'Russia' },

  // Middle East & Central Asia
  { id: 'Asia/Dubai', name: 'UAE (Dubai)', offset: 'UTC+4:00', region: 'Asia' },
  { id: 'Asia/Karachi', name: 'Pakistan (Karachi)', offset: 'UTC+5:00', region: 'Asia' },
  { id: 'Asia/Kolkata', name: 'India (Kolkata)', offset: 'UTC+5:30', region: 'Asia' },
  { id: 'Asia/Dhaka', name: 'Bangladesh (Dhaka)', offset: 'UTC+6:00', region: 'Asia' },
  { id: 'Asia/Bangkok', name: 'Thailand (Bangkok)', offset: 'UTC+7:00', region: 'Asia' },

  // East Asia
  { id: 'Asia/Singapore', name: 'Singapore', offset: 'UTC+8:00', region: 'Asia' },
  { id: 'Asia/Hong_Kong', name: 'Hong Kong', offset: 'UTC+8:00', region: 'Asia' },
  { id: 'Asia/Shanghai', name: 'China (Shanghai)', offset: 'UTC+8:00', region: 'Asia' },
  { id: 'Asia/Taipei', name: 'Taiwan (Taipei)', offset: 'UTC+8:00', region: 'Asia' },
  { id: 'Asia/Seoul', name: 'South Korea (Seoul)', offset: 'UTC+9:00', region: 'Asia' },
  { id: 'Asia/Tokyo', name: 'Japan (Tokyo)', offset: 'UTC+9:00', region: 'Asia' },

  // Australia & Pacific
  { id: 'Australia/Perth', name: 'Western Australia (Perth)', offset: 'UTC+8:00', region: 'Australia' },
  { id: 'Australia/Darwin', name: 'Northern Territory (Darwin)', offset: 'UTC+9:30', region: 'Australia' },
  { id: 'Australia/Adelaide', name: 'South Australia (Adelaide)', offset: 'UTC+9:30', region: 'Australia' },
  { id: 'Australia/Brisbane', name: 'Queensland (Brisbane)', offset: 'UTC+10:00', region: 'Australia' },
  { id: 'Australia/Sydney', name: 'New South Wales (Sydney)', offset: 'UTC+10:00', region: 'Australia' },
  { id: 'Australia/Melbourne', name: 'Victoria (Melbourne)', offset: 'UTC+10:00', region: 'Australia' },
  { id: 'Pacific/Auckland', name: 'New Zealand (Auckland)', offset: 'UTC+12:00', region: 'Australia' },
];

// Helper to detect user's timezone
export const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Europe/Moscow';
  }
};

// Get effective timezone (resolves 'auto' to actual timezone)
export const getEffectiveTimezone = (timezone: string): string => {
  if (timezone === 'auto') {
    return detectTimezone();
  }
  return timezone;
};

export interface LanguageConfig {
  id: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const languages: LanguageConfig[] = [
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { id: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { id: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

export interface ThemeConfig {
  id: Theme;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    backgroundGradient: string;
    glow1: string;
    glow2: string;
    glow3: string;
  };
}

export const themes: ThemeConfig[] = [
  {
    id: 'cosmic-dark',
    name: 'Cosmic Dark',
    colors: {
      primary: '#7c3aed',
      secondary: '#3b82f6',
      accent: '#06b6d4',
      background: '#0a0a1a',
      backgroundGradient: 'linear-gradient(135deg, #0a0a1a 0%, #1e1b4b 50%, #0a0a1a 100%)',
      glow1: 'rgba(124, 58, 237, 0.3)',
      glow2: 'rgba(59, 130, 246, 0.3)',
      glow3: 'rgba(6, 182, 212, 0.3)',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      accent: '#14b8a6',
      background: '#0a1628',
      backgroundGradient: 'linear-gradient(135deg, #0a1628 0%, #0c4a6e 50%, #0a1628 100%)',
      glow1: 'rgba(14, 165, 233, 0.3)',
      glow2: 'rgba(6, 182, 212, 0.3)',
      glow3: 'rgba(20, 184, 166, 0.3)',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    colors: {
      primary: '#10b981',
      secondary: '#22c55e',
      accent: '#84cc16',
      background: '#0a1a0f',
      backgroundGradient: 'linear-gradient(135deg, #0a1a0f 0%, #14532d 50%, #0a1a0f 100%)',
      glow1: 'rgba(16, 185, 129, 0.3)',
      glow2: 'rgba(34, 197, 94, 0.3)',
      glow3: 'rgba(132, 204, 22, 0.3)',
    },
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    colors: {
      primary: '#f97316',
      secondary: '#ef4444',
      accent: '#eab308',
      background: '#1a0f0a',
      backgroundGradient: 'linear-gradient(135deg, #1a0f0a 0%, #7c2d12 50%, #1a0f0a 100%)',
      glow1: 'rgba(249, 115, 22, 0.3)',
      glow2: 'rgba(239, 68, 68, 0.3)',
      glow3: 'rgba(234, 179, 8, 0.3)',
    },
  },
  {
    id: 'aurora-purple',
    name: 'Aurora Purple',
    colors: {
      primary: '#a855f7',
      secondary: '#ec4899',
      accent: '#8b5cf6',
      background: '#0f0a1a',
      backgroundGradient: 'linear-gradient(135deg, #0f0a1a 0%, #4c1d95 50%, #0f0a1a 100%)',
      glow1: 'rgba(168, 85, 247, 0.3)',
      glow2: 'rgba(236, 72, 153, 0.3)',
      glow3: 'rgba(139, 92, 246, 0.3)',
    },
  },
  {
    id: 'midnight-black',
    name: 'Midnight Black',
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#a78bfa',
      background: '#050505',
      backgroundGradient: 'linear-gradient(135deg, #050505 0%, #1f1f1f 50%, #050505 100%)',
      glow1: 'rgba(99, 102, 241, 0.2)',
      glow2: 'rgba(139, 92, 246, 0.2)',
      glow3: 'rgba(167, 139, 250, 0.2)',
    },
  },
  // Subtle/Modest themes - easier on eyes
  {
    id: 'soft-slate',
    name: 'Soft Slate',
    colors: {
      primary: '#64748b',
      secondary: '#475569',
      accent: '#94a3b8',
      background: '#1e293b',
      backgroundGradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
      glow1: 'rgba(100, 116, 139, 0.15)',
      glow2: 'rgba(71, 85, 105, 0.15)',
      glow3: 'rgba(148, 163, 184, 0.15)',
    },
  },
  {
    id: 'warm-sepia',
    name: 'Warm Sepia',
    colors: {
      primary: '#a8967a',
      secondary: '#8b7355',
      accent: '#c4b59d',
      background: '#1c1917',
      backgroundGradient: 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
      glow1: 'rgba(168, 150, 122, 0.12)',
      glow2: 'rgba(139, 115, 85, 0.12)',
      glow3: 'rgba(196, 181, 157, 0.12)',
    },
  },
  {
    id: 'minimal-gray',
    name: 'Minimal Gray',
    colors: {
      primary: '#737373',
      secondary: '#525252',
      accent: '#a3a3a3',
      background: '#171717',
      backgroundGradient: 'linear-gradient(135deg, #171717 0%, #262626 50%, #171717 100%)',
      glow1: 'rgba(115, 115, 115, 0.1)',
      glow2: 'rgba(82, 82, 82, 0.1)',
      glow3: 'rgba(163, 163, 163, 0.1)',
    },
  },
  {
    id: 'gentle-lavender',
    name: 'Gentle Lavender',
    colors: {
      primary: '#9ca3af',
      secondary: '#7c8591',
      accent: '#b8bfc9',
      background: '#18181b',
      backgroundGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%)',
      glow1: 'rgba(156, 163, 175, 0.12)',
      glow2: 'rgba(124, 133, 145, 0.12)',
      glow3: 'rgba(184, 191, 201, 0.12)',
    },
  },
];

interface SettingsState {
  theme: Theme;
  language: Language;
  timezone: string;
  compactMode: boolean;
  animations: boolean;
  glassOpacity: number; // 0-100
  starBrightness: number; // 0-100
  _hasHydrated: boolean;
  _userId: string | null; // Track current user for syncing
  _isSyncing: boolean;

  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setTimezone: (timezone: string) => void;
  setCompactMode: (enabled: boolean) => void;
  setAnimations: (enabled: boolean) => void;
  setGlassOpacity: (opacity: number) => void;
  setStarBrightness: (brightness: number) => void;
  setHasHydrated: (state: boolean) => void;
  getCurrentTheme: () => ThemeConfig;
  getCurrentLanguage: () => LanguageConfig;
  getCurrentTimezone: () => TimezoneConfig | undefined;
  getEffectiveTimezone: () => string;

  // Sync functions
  setUserId: (userId: string | null) => void;
  loadFromServer: (userId: string) => Promise<void>;
  syncToServer: () => Promise<void>;
}

// Debounce helper for sync
let syncTimeout: NodeJS.Timeout | null = null;
const debouncedSync = (syncFn: () => Promise<void>) => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncFn();
  }, 1000); // Wait 1 second before syncing to reduce API calls
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'cosmic-dark',
      language: 'en',
      timezone: 'auto',
      compactMode: false,
      animations: true,
      glassOpacity: 50,
      starBrightness: 50,
      _hasHydrated: false,
      _userId: null,
      _isSyncing: false,

      setTheme: (theme) => {
        set({ theme });
        debouncedSync(get().syncToServer);
      },
      setLanguage: (language) => {
        set({ language });
        debouncedSync(get().syncToServer);
      },
      setTimezone: (timezone) => {
        set({ timezone });
        debouncedSync(get().syncToServer);
      },
      setCompactMode: (enabled) => {
        set({ compactMode: enabled });
        debouncedSync(get().syncToServer);
      },
      setAnimations: (enabled) => {
        set({ animations: enabled });
        debouncedSync(get().syncToServer);
      },
      setGlassOpacity: (opacity) => {
        set({ glassOpacity: opacity });
        debouncedSync(get().syncToServer);
      },
      setStarBrightness: (brightness) => {
        set({ starBrightness: brightness });
        debouncedSync(get().syncToServer);
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      getCurrentTheme: () => {
        const currentTheme = get().theme;
        return themes.find(t => t.id === currentTheme) || themes[0];
      },

      getCurrentLanguage: () => {
        const currentLang = get().language;
        return languages.find(l => l.id === currentLang) || languages[0];
      },

      getCurrentTimezone: () => {
        const currentTz = get().timezone;
        return timezones.find(t => t.id === currentTz);
      },

      getEffectiveTimezone: () => {
        const tz = get().timezone;
        return getEffectiveTimezone(tz);
      },

      // Sync functions
      setUserId: (userId) => set({ _userId: userId }),

      loadFromServer: async (userId: string) => {
        // Set userId immediately so subsequent changes can be synced
        set({ _userId: userId });

        try {
          const response = await usersApi.getPreferences(userId);
          const prefs = response.data.data;

          // Apply server preferences - these take priority over local
          set({
            theme: (prefs.theme as Theme) || 'cosmic-dark',
            language: (prefs.language as Language) || 'en',
            timezone: prefs.timezone || 'auto',
            compactMode: prefs.compactMode ?? false,
            animations: prefs.animations ?? true,
            glassOpacity: prefs.glassOpacity ?? 50,
            starBrightness: prefs.starBrightness ?? 50,
          });
          console.log('Preferences loaded from server:', prefs.theme, prefs.language);
        } catch (error) {
          console.log('Failed to load preferences from server, using local:', error);
          // If server fails, sync current local preferences to server
          get().syncToServer();
        }
      },

      syncToServer: async () => {
        const state = get();
        const userId = state._userId;

        if (!userId) {
          console.log('Cannot sync preferences: no userId set');
          return;
        }

        if (state._isSyncing) {
          console.log('Already syncing preferences, skipping...');
          return;
        }

        set({ _isSyncing: true });
        try {
          await usersApi.updatePreferences(userId, {
            theme: state.theme,
            language: state.language,
            timezone: state.timezone,
            compactMode: state.compactMode,
            animations: state.animations,
            glassOpacity: state.glassOpacity,
            starBrightness: state.starBrightness,
          });
          console.log('Preferences synced to server:', state.theme, state.language);
        } catch (error) {
          console.error('Failed to sync preferences to server:', error);
        } finally {
          set({ _isSyncing: false });
        }
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        timezone: state.timezone,
        compactMode: state.compactMode,
        animations: state.animations,
        glassOpacity: state.glassOpacity,
        starBrightness: state.starBrightness,
        _userId: state._userId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Settings hydration error:', error);
          useSettingsStore.setState({ _hasHydrated: true });
          return;
        }

        if (state) {
          state.setHasHydrated(true);
        } else {
          useSettingsStore.setState({ _hasHydrated: true });
        }
      },
    }
  )
);
