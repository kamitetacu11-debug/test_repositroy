'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  Award,
  Zap,
  UserPlus,
  Clock,
  X,
  Check,
  Trash2,
  Filter,
  Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Input } from '@/components/ui/input';
import { useSettingsStore } from '@/stores/settings.store';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'task' | 'team' | 'achievement' | 'mention' | 'points';
  title: string;
  message: string;
  time: string;
  date: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'task',
    title: 'Task Completed',
    message: 'John Doe completed "Design dashboard UI"',
    time: '5 min ago',
    date: 'Today',
    read: false,
  },
  {
    id: '2',
    type: 'mention',
    title: 'New Comment',
    message: 'Jane mentioned you in "API implementation" - "Hey, can you review this endpoint?"',
    time: '15 min ago',
    date: 'Today',
    read: false,
  },
  {
    id: '3',
    type: 'achievement',
    title: 'Achievement Unlocked!',
    message: 'You earned "Task Master" badge for completing 100 tasks',
    time: '1 hour ago',
    date: 'Today',
    read: false,
  },
  {
    id: '4',
    type: 'points',
    title: 'Points Earned',
    message: 'You earned +50 points for completing "Fix login bug"',
    time: '2 hours ago',
    date: 'Today',
    read: true,
  },
  {
    id: '5',
    type: 'team',
    title: 'Team Update',
    message: 'You were added to "Mobile Team" by Sarah Wilson',
    time: '3 hours ago',
    date: 'Today',
    read: true,
  },
  {
    id: '6',
    type: 'task',
    title: 'Task Assigned',
    message: 'You have been assigned "Implement dark mode toggle"',
    time: '5 hours ago',
    date: 'Today',
    read: true,
  },
  {
    id: '7',
    type: 'points',
    title: 'Weekly Bonus',
    message: 'You earned +100 bonus points for top performance this week!',
    time: 'Yesterday',
    date: 'Yesterday',
    read: true,
  },
  {
    id: '8',
    type: 'achievement',
    title: 'New Rank!',
    message: 'Congratulations! You reached SPECIALIST rank',
    time: 'Yesterday',
    date: 'Yesterday',
    read: true,
  },
  {
    id: '9',
    type: 'mention',
    title: 'Reply to your comment',
    message: 'Bob replied to your comment in "Database optimization"',
    time: '2 days ago',
    date: 'This Week',
    read: true,
  },
  {
    id: '10',
    type: 'team',
    title: 'Team Achievement',
    message: 'Frontend Team completed weekly goal - 500+ points!',
    time: '3 days ago',
    date: 'This Week',
    read: true,
  },
];

type FilterType = 'all' | 'unread' | 'task' | 'team' | 'achievement' | 'mention' | 'points';

export default function NotificationsPage() {
  const { getCurrentTheme } = useSettingsStore();
  const currentTheme = getCurrentTheme();
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = filter === 'all' || filter === 'unread' ? (filter === 'unread' ? !n.read : true) : n.type === filter;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = notification.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'task', label: 'Tasks' },
    { value: 'mention', label: 'Mentions' },
    { value: 'achievement', label: 'Achievements' },
    { value: 'points', label: 'Points' },
    { value: 'team', label: 'Team' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${currentTheme.colors.primary}20` }}
            >
              <Bell className="w-6 h-6" style={{ color: currentTheme.colors.primary }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-gray-400">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <Check className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" className="text-status-error hover:text-status-error" onClick={clearAllNotifications}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(option.value)}
                className={cn(
                  "flex-shrink-0",
                  filter === option.value && "bg-cosmic-purple hover:bg-cosmic-purple/80"
                )}
              >
                {option.label}
                {option.value === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-status-error">
                    {unreadCount}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Notifications List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filteredNotifications.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-16 text-center">
                <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No notifications</h3>
                <p className="text-gray-500">
                  {searchQuery ? 'No notifications match your search' : 'You\'re all caught up!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedNotifications).map(([date, items]) => (
                <div key={date}>
                  <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {date}
                  </h3>
                  <Card className="glass overflow-hidden">
                    <AnimatePresence mode="popLayout">
                      {items.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{
                            opacity: 0,
                            x: 100,
                            scale: 0.8,
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            transition: { duration: 0.3, ease: 'easeOut' }
                          }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-4 p-4 border-b border-glass-border/50 last:border-0 hover:bg-glass-light/50 transition cursor-pointer"
                          style={{
                            backgroundColor: !notification.read ? `${currentTheme.colors.primary}08` : undefined
                          }}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-glass-light flex items-center justify-center">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{notification.title}</p>
                              {!notification.read && (
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: currentTheme.colors.primary }}
                                />
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mb-2">{notification.message}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {notification.time}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-gray-400 hover:text-white"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-status-error"
                              title="Delete"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
