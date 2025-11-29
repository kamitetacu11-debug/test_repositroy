'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings.store';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Convert RGB to HSV
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  const s = max === 0 ? 0 : diff / max;
  const v = max;

  if (diff !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
}

// Convert HSV to RGB
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  v /= 100;

  let r = 0, g = 0, b = 0;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ value, onChange, className }, ref) => {
    const theme = useSettingsStore((state) => state.getCurrentTheme());
    const rgb = hexToRgb(value || '#3B82F6');
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    const [hue, setHue] = React.useState(hsv.h);
    const [saturation, setSaturation] = React.useState(hsv.s);
    const [brightness, setBrightness] = React.useState(hsv.v);

    const paletteRef = React.useRef<HTMLDivElement>(null);
    const hueRef = React.useRef<HTMLDivElement>(null);
    const [isDraggingPalette, setIsDraggingPalette] = React.useState(false);
    const [isDraggingHue, setIsDraggingHue] = React.useState(false);

    // Sync internal state when value changes externally
    React.useEffect(() => {
      const newRgb = hexToRgb(value || '#3B82F6');
      const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
      setHue(newHsv.h);
      setSaturation(newHsv.s);
      setBrightness(newHsv.v);
    }, [value]);

    // Update color when HSV changes
    const updateColor = React.useCallback((h: number, s: number, v: number) => {
      const newRgb = hsvToRgb(h, s, v);
      const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      onChange(hex);
    }, [onChange]);

    // Handle palette (saturation/brightness) interaction
    const handlePaletteInteraction = React.useCallback((e: React.MouseEvent | MouseEvent) => {
      if (!paletteRef.current) return;

      const rect = paletteRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const newSaturation = x * 100;
      const newBrightness = (1 - y) * 100;

      setSaturation(newSaturation);
      setBrightness(newBrightness);
      updateColor(hue, newSaturation, newBrightness);
    }, [hue, updateColor]);

    // Handle hue slider interaction
    const handleHueInteraction = React.useCallback((e: React.MouseEvent | MouseEvent) => {
      if (!hueRef.current) return;

      const rect = hueRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newHue = x * 360;

      setHue(newHue);
      updateColor(newHue, saturation, brightness);
    }, [saturation, brightness, updateColor]);

    // Mouse event handlers
    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingPalette) handlePaletteInteraction(e);
        if (isDraggingHue) handleHueInteraction(e);
      };

      const handleMouseUp = () => {
        setIsDraggingPalette(false);
        setIsDraggingHue(false);
      };

      if (isDraggingPalette || isDraggingHue) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDraggingPalette, isDraggingHue, handlePaletteInteraction, handleHueInteraction]);

    // Handle RGB input changes
    const handleRgbChange = (channel: 'r' | 'g' | 'b', inputValue: string) => {
      const numValue = parseInt(inputValue) || 0;
      const clampedValue = Math.max(0, Math.min(255, numValue));

      const newRgb = { ...rgb, [channel]: clampedValue };
      const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      onChange(hex);
    };

    // Handle hex input change
    const handleHexChange = (inputValue: string) => {
      let hex = inputValue;
      if (!hex.startsWith('#')) {
        hex = '#' + hex;
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        onChange(hex);
      }
    };

    const pureHueColor = `hsl(${hue}, 100%, 50%)`;

    return (
      <div
        ref={ref}
        className={cn(
          'p-4 rounded-xl border border-glass-border bg-glass-light backdrop-blur-sm',
          className
        )}
        style={{
          boxShadow: `0 0 20px ${theme.colors.glow1}`,
        }}
      >
        {/* Hex display */}
        <div
          className="mb-3 px-3 py-2 rounded-lg text-center text-sm font-mono text-white"
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderBottom: `2px solid ${theme.colors.primary}`
          }}
        >
          {value?.toUpperCase() || '#3B82F6'}
        </div>

        {/* Color palette (saturation/brightness) */}
        <div
          ref={paletteRef}
          className="relative w-full h-32 rounded-lg cursor-crosshair mb-3 overflow-hidden"
          style={{
            background: `linear-gradient(to right, #fff, ${pureHueColor})`,
          }}
          onMouseDown={(e) => {
            setIsDraggingPalette(true);
            handlePaletteInteraction(e);
          }}
        >
          {/* Brightness overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent, #000)',
            }}
          />
          {/* Picker indicator */}
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
            style={{
              left: `calc(${saturation}% - 8px)`,
              top: `calc(${100 - brightness}% - 8px)`,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        {/* Hue slider */}
        <div
          ref={hueRef}
          className="relative w-full h-4 rounded-full cursor-pointer mb-4"
          style={{
            background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          }}
          onMouseDown={(e) => {
            setIsDraggingHue(true);
            handleHueInteraction(e);
          }}
        >
          {/* Hue indicator */}
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none"
            style={{
              left: `calc(${(hue / 360) * 100}% - 8px)`,
              top: '0',
              backgroundColor: pureHueColor,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        {/* RGB inputs */}
        <div className="flex items-center gap-2">
          {/* Color preview */}
          <div
            className="w-10 h-10 rounded-lg border border-glass-border flex-shrink-0"
            style={{ backgroundColor: value || '#3B82F6' }}
          />

          {/* RGB fields */}
          <div className="flex gap-1 flex-1">
            {[
              { label: 'R', value: rgb.r, channel: 'r' as const },
              { label: 'G', value: rgb.g, channel: 'g' as const },
              { label: 'B', value: rgb.b, channel: 'b' as const },
            ].map(({ label, value: channelValue, channel }) => (
              <div key={channel} className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={channelValue}
                  onChange={(e) => handleRgbChange(channel, e.target.value)}
                  className="w-full h-10 rounded-lg border border-glass-border bg-glass-light px-2 py-1 text-sm text-white text-center focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{
                    focusRing: theme.colors.primary,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.colors.primary;
                    e.target.style.boxShadow = `0 0 0 2px ${theme.colors.primary}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '';
                    e.target.style.boxShadow = '';
                  }}
                />
                <div className="text-center text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
