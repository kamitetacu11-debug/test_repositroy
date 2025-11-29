'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { cn, getRankColor, getInitials } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tasks', href: '/dashboard/tasks', icon: Target },
  { name: 'Teams', href: '/dashboard/teams', icon: Users },
  { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'AI Insights', href: '/dashboard/ai', icon: Sparkles },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          'fixed inset-y-0 left-0 z-50 w-64 glass-heavy transform lg:translate-x-0 lg:static lg:flex lg:flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6">
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
          <nav className="flex-1 px-4 space-y-1">
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
          <div className="p-4 border-t border-glass-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-glass-light">
              <div className="w-10 h-10 rounded-full bg-cosmic-purple/30 flex items-center justify-center font-medium">
                {user ? getInitials(user.firstName, user.lastName) : 'U'}
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

            <div className="flex items-center gap-2 mt-3">
              <Link href="/dashboard/settings" className="flex-1">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
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
      <div className="flex-1 flex flex-col min-h-screen">
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
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-status-error rounded-full" />
            </Button>

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
