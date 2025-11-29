'use client';

import { useEffect } from 'react';
import { useSettingsStore, themes } from '@/stores/settings.store';
import { cn } from '@/lib/utils';

interface ThemeWrapperProps {
  children: React.ReactNode;
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { theme, compactMode, animations, glassOpacity } = useSettingsStore();

  const currentTheme = themes.find(t => t.id === theme) || themes[0];

  useEffect(() => {
    const root = document.documentElement;

    // Set CSS custom properties for theme colors
    root.style.setProperty('--theme-primary', currentTheme.colors.primary);
    root.style.setProperty('--theme-secondary', currentTheme.colors.secondary);
    root.style.setProperty('--theme-accent', currentTheme.colors.accent);
    root.style.setProperty('--theme-background', currentTheme.colors.background);
    root.style.setProperty('--theme-glow1', currentTheme.colors.glow1);
    root.style.setProperty('--theme-glow2', currentTheme.colors.glow2);
    root.style.setProperty('--theme-glow3', currentTheme.colors.glow3);

    // Glass opacity (0-100 -> 0-0.2)
    const glassAlpha = (glassOpacity / 100) * 0.2;
    root.style.setProperty('--glass-opacity', `${glassAlpha}`);
    root.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${glassAlpha})`);
    root.style.setProperty('--glass-bg-heavy', `rgba(255, 255, 255, ${glassAlpha * 2})`);

    // Compact mode
    if (compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    // Animations
    if (!animations) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [theme, compactMode, animations, glassOpacity, currentTheme]);

  return (
    <div className={cn('min-h-screen', compactMode && 'compact-mode')}>
      {/* Dynamic Cosmic Background */}
      <div className="fixed inset-0 -z-10">
        {/* Base gradient */}
        <div
          className="absolute inset-0 transition-all duration-500"
          style={{ background: currentTheme.colors.backgroundGradient }}
        />

        {/* Nebula effects */}
        <div
          className={cn(
            'absolute top-0 left-0 w-96 h-96 opacity-30 blur-3xl',
            animations && 'animate-nebula'
          )}
          style={{ background: `radial-gradient(circle, ${currentTheme.colors.glow1} 0%, transparent 70%)` }}
        />
        <div
          className={cn(
            'absolute bottom-0 right-0 w-96 h-96 opacity-30 blur-3xl',
            animations && 'animate-nebula'
          )}
          style={{
            background: `radial-gradient(circle, ${currentTheme.colors.glow2} 0%, transparent 70%)`,
            animationDelay: '-10s',
          }}
        />
        <div
          className={cn(
            'absolute top-1/2 left-1/2 w-64 h-64 opacity-20 blur-3xl',
            animations && 'animate-nebula'
          )}
          style={{
            background: `radial-gradient(circle, ${currentTheme.colors.glow3} 0%, transparent 70%)`,
            animationDelay: '-5s',
          }}
        />

        {/* Stars */}
        <div className="stars" />
      </div>

      {children}
    </div>
  );
}
