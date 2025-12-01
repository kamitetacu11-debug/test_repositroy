'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle2,
  X,
  Calendar,
  Zap,
  FolderOpen,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settings.store';

// Mock tasks data for each day
const tasksData: Record<string, { id: string; title: string; points: number; completedAt: string; category: string }[]> = {
  Mon: [
    { id: 'T-101', title: 'Fix authentication bug', points: 30, completedAt: '09:45', category: 'Development' },
    { id: 'T-102', title: 'Update user documentation', points: 15, completedAt: '11:20', category: 'Documentation' },
    { id: 'T-103', title: 'Review PR #234', points: 25, completedAt: '14:30', category: 'Development' },
    { id: 'T-104', title: 'Design login modal', points: 20, completedAt: '16:00', category: 'Design' },
    { id: 'T-105', title: 'Unit tests for auth', points: 30, completedAt: '17:30', category: 'Testing' },
  ],
  Tue: [
    { id: 'T-106', title: 'Implement dashboard API', points: 35, completedAt: '08:30', category: 'Development' },
    { id: 'T-107', title: 'Create chart components', points: 25, completedAt: '10:15', category: 'Development' },
    { id: 'T-108', title: 'User onboarding flow', points: 20, completedAt: '11:45', category: 'Design' },
    { id: 'T-109', title: 'Database optimization', points: 40, completedAt: '14:00', category: 'Development' },
    { id: 'T-110', title: 'Write API docs', points: 20, completedAt: '15:30', category: 'Documentation' },
    { id: 'T-111', title: 'Integration tests', points: 25, completedAt: '16:45', category: 'Testing' },
    { id: 'T-112', title: 'Review team tasks', points: 15, completedAt: '17:30', category: 'Development' },
    { id: 'T-113', title: 'Fix mobile layout', points: 20, completedAt: '18:00', category: 'Design' },
  ],
  Wed: [
    { id: 'T-114', title: 'Team standup notes', points: 10, completedAt: '10:00', category: 'Documentation' },
    { id: 'T-115', title: 'Bug fix: sidebar', points: 35, completedAt: '14:30', category: 'Development' },
    { id: 'T-116', title: 'Code review session', points: 35, completedAt: '16:00', category: 'Development' },
  ],
  Thu: [
    { id: 'T-117', title: 'Implement notifications', points: 30, completedAt: '08:45', category: 'Development' },
    { id: 'T-118', title: 'Design system updates', points: 25, completedAt: '09:30', category: 'Design' },
    { id: 'T-119', title: 'Performance audit', points: 35, completedAt: '10:45', category: 'Testing' },
    { id: 'T-120', title: 'Refactor auth module', points: 40, completedAt: '12:00', category: 'Development' },
    { id: 'T-121', title: 'Update README', points: 15, completedAt: '13:30', category: 'Documentation' },
    { id: 'T-122', title: 'API endpoint tests', points: 30, completedAt: '14:45', category: 'Testing' },
    { id: 'T-123', title: 'Mobile responsive fix', points: 25, completedAt: '15:30', category: 'Development' },
    { id: 'T-124', title: 'Icon library update', points: 20, completedAt: '16:15', category: 'Design' },
    { id: 'T-125', title: 'Database migration', points: 35, completedAt: '17:00', category: 'Development' },
    { id: 'T-126', title: 'Security review', points: 25, completedAt: '18:00', category: 'Testing' },
  ],
  Fri: [
    { id: 'T-127', title: 'Sprint planning', points: 15, completedAt: '09:00', category: 'Documentation' },
    { id: 'T-128', title: 'Feature: dark mode', points: 35, completedAt: '11:30', category: 'Development' },
    { id: 'T-129', title: 'UI polish pass', points: 25, completedAt: '13:00', category: 'Design' },
    { id: 'T-130', title: 'Load testing', points: 30, completedAt: '14:30', category: 'Testing' },
    { id: 'T-131', title: 'Bugfix: dropdown', points: 25, completedAt: '15:45', category: 'Development' },
    { id: 'T-132', title: 'Deploy to staging', points: 25, completedAt: '16:30', category: 'Development' },
    { id: 'T-133', title: 'E2E test suite', points: 25, completedAt: '17:30', category: 'Testing' },
  ],
  Sat: [
    { id: 'T-134', title: 'Hotfix: login issue', points: 30, completedAt: '11:00', category: 'Development' },
    { id: 'T-135', title: 'Monitoring setup', points: 20, completedAt: '14:00', category: 'Development' },
  ],
  Sun: [
    { id: 'T-136', title: 'Code cleanup', points: 20, completedAt: '10:30', category: 'Development' },
    { id: 'T-137', title: 'Week review notes', points: 15, completedAt: '12:00', category: 'Documentation' },
    { id: 'T-138', title: 'Plan next sprint', points: 25, completedAt: '14:30', category: 'Documentation' },
    { id: 'T-139', title: 'Update dependencies', points: 40, completedAt: '16:00', category: 'Development' },
  ],
};

const weeklyData = [
  { day: 'Mon', tasks: 5, points: 120 },
  { day: 'Tue', tasks: 8, points: 200 },
  { day: 'Wed', tasks: 3, points: 80 },
  { day: 'Thu', tasks: 10, points: 280 },
  { day: 'Fri', tasks: 7, points: 180 },
  { day: 'Sat', tasks: 2, points: 50 },
  { day: 'Sun', tasks: 4, points: 100 },
];

const maxTasks = Math.max(...weeklyData.map(d => d.tasks));

const categoryColors: Record<string, string> = {
  Development: 'bg-cosmic-purple',
  Design: 'bg-cosmic-cyan',
  Documentation: 'bg-yellow-500',
  Testing: 'bg-status-success',
};

const categoryColorValues: Record<string, string> = {
  Development: '#7c3aed',
  Design: '#06b6d4',
  Documentation: '#eab308',
  Testing: '#10b981',
};

// Get all tasks grouped by category
const getAllTasksByCategory = () => {
  const allTasks: { id: string; title: string; points: number; completedAt: string; category: string; day: string }[] = [];
  Object.entries(tasksData).forEach(([day, tasks]) => {
    tasks.forEach(task => {
      allTasks.push({ ...task, day });
    });
  });
  return allTasks;
};

const categoriesData = [
  { label: 'Development', count: 24, percentage: 45, color: 'bg-cosmic-purple' },
  { label: 'Design', count: 12, percentage: 22, color: 'bg-cosmic-cyan' },
  { label: 'Documentation', count: 8, percentage: 15, color: 'bg-yellow-500' },
  { label: 'Testing', count: 10, percentage: 18, color: 'bg-status-success' },
];

export default function AnalyticsPage() {
  const t = useTranslation();
  const { getCurrentTheme } = useSettingsStore();
  const theme = getCurrentTheme();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const selectedDayData = selectedDay ? weeklyData.find(d => d.day === selectedDay) : null;
  const selectedDayTasks = selectedDay ? tasksData[selectedDay] || [] : [];

  const allTasks = getAllTasksByCategory();
  const categoryTasks = selectedCategory
    ? allTasks.filter(task => task.category === selectedCategory)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-cosmic-purple" />
            {t.analytics.title}
          </h1>
          <p className="text-gray-400 mt-1">{t.analytics.subtitle}</p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { label: t.analytics.tasksThisWeek, value: 39, change: '+12%', up: true, icon: Target, color: 'text-cosmic-purple' },
            { label: t.analytics.pointsEarned, value: '1,010', change: '+8%', up: true, icon: TrendingUp, color: 'text-status-success' },
            { label: t.analytics.avgTimePerTask, value: '2.5h', change: '-15%', up: true, icon: Clock, color: 'text-cosmic-cyan' },
            { label: t.analytics.completionRate, value: '94%', change: '+5%', up: true, icon: CheckCircle2, color: 'text-yellow-500' },
          ].map((stat, i) => (
            <Card key={i} className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.up ? (
                        <TrendingUp className="w-4 h-4 text-status-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-status-error" />
                      )}
                      <span className={stat.up ? 'text-status-success' : 'text-status-error'}>
                        {stat.change}
                      </span>
                      <span className="text-gray-400 text-sm">{t.analytics.vsLastWeek}</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-glass-light flex items-center justify-center">
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t.analytics.weeklyActivity}</span>
                  <span className="text-sm font-normal text-gray-400">
                    {t.analytics.clickToViewTasks}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between h-64 gap-2">
                  {weeklyData.map((day, i) => (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex flex-col items-center gap-1">
                        <span className="text-sm text-cosmic-purple font-medium">
                          {day.points}
                        </span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{
                            height: `${(day.tasks / maxTasks) * 180}px`,
                            scale: hoveredDay === day.day ? 1.05 : 1,
                          }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                          onClick={() => setSelectedDay(day.day)}
                          onMouseEnter={() => setHoveredDay(day.day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`w-full max-w-[40px] bg-gradient-to-t from-cosmic-purple to-cosmic-blue rounded-t-lg cursor-pointer transition-all
                            ${hoveredDay === day.day ? 'shadow-lg shadow-cosmic-purple/30' : ''}
                            ${selectedDay === day.day ? 'ring-2 ring-white ring-offset-2 ring-offset-cosmic-dark' : ''}
                          `}
                        />
                      </div>
                      <span className={`text-sm ${selectedDay === day.day ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {day.day}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Performance Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass h-full">
              <CardHeader>
                <CardTitle>{t.analytics.performance}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: t.analytics.productivityScore, value: 87, color: 'bg-cosmic-purple' },
                  { label: t.analytics.taskQuality, value: 92, color: 'bg-status-success' },
                  { label: t.analytics.teamCollaboration, value: 78, color: 'bg-cosmic-cyan' },
                  { label: t.analytics.goalAchievement, value: 85, color: 'bg-yellow-500' },
                ].map((metric, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">{metric.label}</span>
                      <span className="text-sm font-medium">{metric.value}%</span>
                    </div>
                    <div className="h-2 bg-glass-light rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${metric.value}%` }}
                        transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                        className={`h-full rounded-full ${metric.color}`}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Task Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t.analytics.taskDistribution}</span>
                <span className="text-sm font-normal text-gray-400">
                  {t.analytics.clickCategoryToView}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categoriesData.map((category, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCategory(category.label)}
                    className="p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition-all cursor-pointer border-2 border-transparent hover:border-glass-border"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      <span className="text-sm text-gray-400">{category.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{category.count}</p>
                    <p className="text-sm text-gray-400">{category.percentage}% of total</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Day Details Modal */}
      <AnimatePresence>
        {selectedDay && selectedDayData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedDay(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-glass-border"
              style={{
                backgroundColor: theme.colors.background,
                boxShadow: `0 0 40px ${theme.colors.glow1}, 0 0 80px ${theme.colors.glow2}`,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
                  >
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedDay === 'Mon' && t.analytics.monday}
                      {selectedDay === 'Tue' && t.analytics.tuesday}
                      {selectedDay === 'Wed' && t.analytics.wednesday}
                      {selectedDay === 'Thu' && t.analytics.thursday}
                      {selectedDay === 'Fri' && t.analytics.friday}
                      {selectedDay === 'Sat' && t.analytics.saturday}
                      {selectedDay === 'Sun' && t.analytics.sunday}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {selectedDayData.tasks} {t.analytics.tasksCompleted} · {selectedDayData.points} {t.analytics.pointsEarnedLower}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 rounded-lg hover:bg-glass-light transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                <div className="space-y-3">
                  {selectedDayTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition-colors"
                    >
                      <div className={`w-1 h-12 rounded-full ${categoryColors[task.category]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0" />
                          <p className="font-medium truncate">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                          <span>#{task.id}</span>
                          <span>·</span>
                          <span>{task.category}</span>
                          <span>·</span>
                          <span>{t.analytics.completedAt} {task.completedAt}</span>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: `${theme.colors.primary}20`,
                          color: theme.colors.primary,
                        }}
                      >
                        <Zap className="w-4 h-4" />
                        <span className="font-medium">+{task.points}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-glass-border bg-glass-light/30">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                    <span>{t.analytics.development}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.secondary }} />
                    <span>{t.analytics.design}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>{t.analytics.documentation}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-status-success" />
                    <span>{t.analytics.testing}</span>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setSelectedDay(null)}>
                  {t.analytics.close}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Details Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedCategory(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-glass-border"
              style={{
                backgroundColor: theme.colors.background,
                boxShadow: `0 0 40px ${theme.colors.glow1}, 0 0 80px ${theme.colors.glow2}`,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${categoryColorValues[selectedCategory]}20` }}
                  >
                    <FolderOpen className="w-6 h-6" style={{ color: categoryColorValues[selectedCategory] }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedCategory}</h2>
                    <p className="text-sm text-gray-400">
                      {categoryTasks.length} {t.tasks.title.toLowerCase()} · {categoryTasks.reduce((sum, task) => sum + task.points, 0)} {t.dashboard.totalPoints.toLowerCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-2 rounded-lg hover:bg-glass-light transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
                <div className="space-y-3">
                  {categoryTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition-colors"
                    >
                      <div
                        className="w-1 h-12 rounded-full"
                        style={{ backgroundColor: categoryColorValues[selectedCategory] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0" />
                          <p className="font-medium truncate">{task.title}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                          <span>#{task.id}</span>
                          <span>·</span>
                          <span>{task.day}</span>
                          <span>·</span>
                          <span>{t.analytics.completedAt} {task.completedAt}</span>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                        style={{
                          backgroundColor: `${categoryColorValues[selectedCategory]}20`,
                          color: categoryColorValues[selectedCategory],
                        }}
                      >
                        <Zap className="w-4 h-4" />
                        <span className="font-medium">+{task.points}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-glass-border bg-glass-light/30">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: categoryColorValues[selectedCategory] }}
                  />
                  <span>{t.analytics.allTasksFromWeek}</span>
                </div>
                <Button variant="ghost" onClick={() => setSelectedCategory(null)}>
                  {t.analytics.close}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
