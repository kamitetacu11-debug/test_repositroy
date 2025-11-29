'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore, themes } from '@/stores/settings.store';
import { cn } from '@/lib/utils';

interface ThemeWrapperProps {
  children: React.ReactNode;
}

// Generate twinkling stars
function TwinklingStars({ animations, brightness }: { animations: boolean; brightness: number }) {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
      baseOpacity: Math.random() * 0.5 + 0.3,
    }));
  }, []);

  if (!animations || brightness === 0) return null;

  const opacityMultiplier = brightness / 50; // 0-2 range

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white star-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: Math.min(star.baseOpacity * opacityMultiplier, 1),
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            boxShadow: `0 0 ${star.size * 2 * opacityMultiplier}px rgba(255, 255, 255, ${0.5 * opacityMultiplier})`,
          }}
        />
      ))}
    </div>
  );
}

// Star brightness control component
function StarBrightnessControl() {
  const { starBrightness, setStarBrightness } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 p-2 rounded-xl bg-glass-light/80 backdrop-blur-sm border border-glass-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "p-2 rounded-lg transition-all",
          isExpanded ? "bg-white/20 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
        )}
        title="Star brightness"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
      {isExpanded && (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={starBrightness}
            onChange={(e) => setStarBrightness(parseInt(e.target.value))}
            className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            title="Star brightness"
          />
          <span className="text-xs text-gray-400 w-8">{starBrightness}%</span>
        </div>
      )}
    </div>
  );
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const { theme, compactMode, animations, glassOpacity, starBrightness } = useSettingsStore();

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

        {/* Static Stars pattern */}
        <div className="stars" />

        {/* Animated Twinkling Stars */}
        <TwinklingStars animations={animations} brightness={starBrightness} />
      </div>

      {children}

      {/* Star Brightness Control */}
      <StarBrightnessControl />
    </div>
  );
}
