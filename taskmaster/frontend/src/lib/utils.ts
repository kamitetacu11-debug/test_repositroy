import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getEffectiveTimezone } from '@/stores/settings.store';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

// Format date for display with timezone support (date only, no time)
export function formatDateWithTimezone(
  dateString: string | null | undefined,
  language: string = 'en',
  timezone: string = 'auto'
): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const effectiveTz = getEffectiveTimezone(timezone);
    const locale = language === 'ru' ? 'ru-RU' : language === 'zh' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: effectiveTz,
    });
  } catch {
    // Fallback to simple date format
    return dateString.split('T')[0];
  }
}

// Short date format with timezone
export function formatShortDateWithTimezone(
  dateString: string | null | undefined,
  language: string = 'en',
  timezone: string = 'auto'
): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    const effectiveTz = getEffectiveTimezone(timezone);
    const locale = language === 'ru' ? 'ru-RU' : language === 'zh' ? 'zh-CN' : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      timeZone: effectiveTz,
    });
  } catch {
    return dateString.split('T')[0];
  }
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(date);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    ROOKIE: '#9CA3AF',
    APPRENTICE: '#60A5FA',
    SPECIALIST: '#34D399',
    EXPERT: '#A78BFA',
    MASTER: '#FBBF24',
    GRANDMASTER: '#F97316',
    LEGEND: '#EF4444',
    MYTHIC: '#EC4899',
  };
  return colors[rank] || colors.ROOKIE;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: '#9CA3AF',
    MEDIUM: '#60A5FA',
    HIGH: '#F59E0B',
    CRITICAL: '#EF4444',
  };
  return colors[priority] || colors.MEDIUM;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    TODO: '#9CA3AF',
    IN_PROGRESS: '#3B82F6',
    IN_REVIEW: '#8B5CF6',
    BLOCKED: '#EF4444',
    COMPLETED: '#10B981',
    CANCELLED: '#6B7280',
  };
  return colors[status] || colors.TODO;
}
