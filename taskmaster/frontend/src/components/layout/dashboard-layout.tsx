'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  LayoutDashboard,
  Target,
  Users,
  Trophy,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Sparkles,
  User,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Award,
  Zap,
  Clock,
  Check,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useSettingsStore } from '@/stores/settings.store';
import { cn, getRankColor, getInitials } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface Notification {
  id: string;
  type: 'task' | 'team' | 'achievement' | 'mention' | 'points';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task',
    title: 'Task Completed',
    message: 'John Doe completed "Design dashboard UI"',
    time: '5 min ago',
    read: false,
  },
  {
    id: '2',
    type: 'mention',
    title: 'New Comment',
    message: 'Jane mentioned you in "API implementation"',
    time: '15 min ago',
    read: false,
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Achievement Unlocked!',
    message: 'You earned "Task Master" badge',
    time: '1 hour ago',
    read: false,
  },
  {
    id: '4',
    type: 'points',
    title: 'Points Earned',
    message: 'You earned +50 points for completing tasks',
    time: '2 hours ago',
    read: true,
  },
  {
    id: '5',
    type: 'team',
    title: 'Team Update',
    message: 'You were added to "Mobile Team"',
    time: '1 day ago',
    read: true,
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { getCurrentTheme } = useSettingsStore();
  const currentTheme = getCurrentTheme();
  const t = useTranslation();

  const navigation = [
    { name: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
    { name: t.nav.tasks, href: '/dashboard/tasks', icon: Target },
    { name: t.nav.teams, href: '/dashboard/teams', icon: Users },
    { name: 'CRM', href: '/dashboard/crm', icon: Building2 },
    { name: t.nav.leaderboard, href: '/dashboard/leaderboard', icon: Trophy },
    { name: t.nav.analytics, href: '/dashboard/analytics', icon: BarChart3 },
    { name: t.nav.aiInsights, href: '/dashboard/ai', icon: Sparkles },
  ];
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task':
        return <CheckCircle2 className="w-5 h-5 text-status-success" />;
      case 'mention':
        return <MessageSquare className="w-5 h-5" style={{ color: currentTheme.colors.secondary }} />;
      case 'achievement':
        return <Award className="w-5 h-5 text-yellow-500" />;
      case 'points':
        return <Zap className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />;
      case 'team':
        return <UserPlus className="w-5 h-5" style={{ color: currentTheme.colors.accent }} />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 glass-heavy transform lg:translate-x-0 lg:flex lg:flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 flex-shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Rocket className="w-8 h-8 text-cosmic-purple" />
              <span className="text-xl font-bold gradient-text">TaskMaster</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-glass-light"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    isActive
                      ? 'bg-cosmic-purple/20 text-cosmic-purple'
                      : 'text-gray-400 hover:text-white hover:bg-glass-light'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 w-1 h-8 bg-cosmic-purple rounded-r-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-glass-border flex-shrink-0">
            <Link href="/dashboard/profile">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-glass-light hover:bg-glass-medium transition cursor-pointer">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-medium overflow-hidden"
                  style={{ backgroundColor: `${currentTheme.colors.primary}30` }}
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user ? getInitials(user.firstName, user.lastName) : 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p
                    className="text-xs truncate"
                    style={{ color: user ? getRankColor(user.currentRank) : '#9CA3AF' }}
                  >
                    {user?.currentRank || 'ROOKIE'} · Lvl {user?.currentLevel || 1}
                  </p>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2 mt-3">
              <Link href="/dashboard/settings" className="flex-1">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  {t.nav.settings}
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="text-gray-400 hover:text-status-error"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass h-16 flex items-center justify-between px-6">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-glass-light"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-status-error rounded-full" />
                )}
              </Button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-glass-border shadow-2xl backdrop-blur-sm z-50 overflow-hidden"
                    style={{ backgroundColor: `${currentTheme.colors.background}f5` }}
                  >
                      {/* Header */}
                      <div className="flex items-center justify-between p-4 border-b border-glass-border">
                        <div className="flex items-center gap-2">
                          <Bell className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
                          <h3 className="font-semibold">{t.nav.notifications}</h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-status-error text-white">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-sm hover:opacity-80 transition"
                            style={{ color: currentTheme.colors.primary }}
                          >
                            {t.common.markAllRead}
                          </button>
                        )}
                      </div>

                      {/* Notifications List */}
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">{t.notificationsPage.noNotifications}</p>
                            <p className="text-sm text-gray-500 mt-1">{t.notificationsPage.allCaughtUp}</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="flex items-start gap-3 p-4 border-b border-glass-border/50 hover:bg-glass-light/50 transition cursor-pointer"
                              style={{
                                backgroundColor: !notification.read ? `${currentTheme.colors.primary}08` : undefined
                              }}
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-glass-light flex items-center justify-center">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{notification.title}</p>
                                  {!notification.read && (
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: currentTheme.colors.primary }}
                                    />
                                  )}
                                </div>
                                <p className="text-sm text-gray-400 truncate">{notification.message}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {notification.time}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearNotification(notification.id);
                                }}
                                className="p-1 rounded hover:bg-glass-light text-gray-500 hover:text-white transition"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="p-3 border-t border-glass-border bg-glass-light/30">
                          <Link
                            href="/dashboard/notifications"
                            className="block text-center text-sm hover:opacity-80 transition"
                            style={{ color: currentTheme.colors.primary }}
                            onClick={() => setNotificationsOpen(false)}
                          >
                            {t.notificationsPage.viewAllNotifications}
                          </Link>
                        </div>
                      )}
                    </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <Link href="/dashboard/profile">
              <Button variant="ghost" size="icon">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
