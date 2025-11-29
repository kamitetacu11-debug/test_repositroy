import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'cosmic-dark' | 'ocean-blue' | 'forest-green' | 'sunset-orange' | 'aurora-purple' | 'midnight-black';

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
