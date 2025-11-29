import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'cosmic-dark' | 'ocean-blue' | 'forest-green' | 'sunset-orange' | 'aurora-purple' | 'midnight-black' | 'soft-slate' | 'warm-sepia' | 'minimal-gray' | 'gentle-lavender';

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
  compactMode: boolean;
  animations: boolean;
  glassOpacity: number; // 0-100

  setTheme: (theme: Theme) => void;
  setCompactMode: (enabled: boolean) => void;
  setAnimations: (enabled: boolean) => void;
  setGlassOpacity: (opacity: number) => void;
  getCurrentTheme: () => ThemeConfig;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'cosmic-dark',
      compactMode: false,
      animations: true,
      glassOpacity: 50,

      setTheme: (theme) => set({ theme }),
      setCompactMode: (enabled) => set({ compactMode: enabled }),
      setAnimations: (enabled) => set({ animations: enabled }),
      setGlassOpacity: (opacity) => set({ glassOpacity: opacity }),

      getCurrentTheme: () => {
        const currentTheme = get().theme;
        return themes.find(t => t.id === currentTheme) || themes[0];
      },
    }),
    {
      name: 'settings-storage',
    }
  )
);
