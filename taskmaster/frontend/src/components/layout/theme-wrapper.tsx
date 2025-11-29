'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSettingsStore, themes } from '@/stores/settings.store';
import { cn } from '@/lib/utils';

interface ThemeWrapperProps {
  children: React.ReactNode;
}

// Generate twinkling stars
function TwinklingStars({ animations }: { animations: boolean }) {
  const stars = useMemo(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.3,
    }));
  }, []);

  if (!animations) return null;

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
            opacity: star.opacity,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
            boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.5)`,
          }}
        />
      ))}
    </div>
  );
}

// White noise audio component
function WhiteNoiseAmbient() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.05);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const toggleNoise = () => {
    if (isPlaying) {
      stopNoise();
    } else {
      startNoise();
    }
  };

  const startNoise = () => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const bufferSize = 2 * audioContext.sampleRate;
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = volume;

      // Add low-pass filter for softer sound
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      whiteNoise.start();
      noiseNodeRef.current = whiteNoise;
      gainNodeRef.current = gainNode;
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to start white noise:', error);
    }
  };

  const stopNoise = () => {
    if (noiseNodeRef.current) {
      noiseNodeRef.current.stop();
      noiseNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    gainNodeRef.current = null;
    setIsPlaying(false);
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopNoise();
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 p-2 rounded-xl bg-glass-light/80 backdrop-blur-sm border border-glass-border">
      <button
        onClick={toggleNoise}
        className={cn(
          "p-2 rounded-lg transition-all",
          isPlaying ? "bg-white/20 text-white" : "text-gray-400 hover:text-white hover:bg-white/10"
        )}
        title={isPlaying ? "Stop ambient sound" : "Play ambient sound"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isPlaying ? (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </>
          ) : (
            <>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          )}
        </svg>
      </button>
      {isPlaying && (
        <input
          type="range"
          min="0"
          max="0.2"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-16 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          title="Volume"
        />
      )}
    </div>
  );
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

        {/* Static Stars pattern */}
        <div className="stars" />

        {/* Animated Twinkling Stars */}
        <TwinklingStars animations={animations} />
      </div>

      {children}

      {/* White Noise Ambient Control */}
      <WhiteNoiseAmbient />
    </div>
  );
}
