'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { formatNumber } from '@/lib/utils';

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

export default function AnalyticsPage() {
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
            Analytics
          </h1>
          <p className="text-gray-400 mt-1">Track your productivity and performance</p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { label: 'Tasks This Week', value: 39, change: '+12%', up: true, icon: Target, color: 'text-cosmic-purple' },
            { label: 'Points Earned', value: '1,010', change: '+8%', up: true, icon: TrendingUp, color: 'text-status-success' },
            { label: 'Avg. Time/Task', value: '2.5h', change: '-15%', up: true, icon: Clock, color: 'text-cosmic-cyan' },
            { label: 'Completion Rate', value: '94%', change: '+5%', up: true, icon: CheckCircle2, color: 'text-yellow-500' },
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
                      <span className="text-gray-400 text-sm">vs last week</span>
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
                <CardTitle>Weekly Activity</CardTitle>
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
                          animate={{ height: `${(day.tasks / maxTasks) * 180}px` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                          className="w-full max-w-[40px] bg-gradient-to-t from-cosmic-purple to-cosmic-blue rounded-t-lg"
                        />
                      </div>
                      <span className="text-sm text-gray-400">{day.day}</span>
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
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Productivity Score', value: 87, color: 'bg-cosmic-purple' },
                  { label: 'Task Quality', value: 92, color: 'bg-status-success' },
                  { label: 'Team Collaboration', value: 78, color: 'bg-cosmic-cyan' },
                  { label: 'Goal Achievement', value: 85, color: 'bg-yellow-500' },
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
              <CardTitle>Task Distribution by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Development', count: 24, percentage: 45, color: 'bg-cosmic-purple' },
                  { label: 'Design', count: 12, percentage: 22, color: 'bg-cosmic-cyan' },
                  { label: 'Documentation', count: 8, percentage: 15, color: 'bg-yellow-500' },
                  { label: 'Testing', count: 10, percentage: 18, color: 'bg-status-success' },
                ].map((category, i) => (
                  <div key={i} className="p-4 rounded-xl bg-glass-light">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${category.color}`} />
                      <span className="text-sm text-gray-400">{category.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{category.count}</p>
                    <p className="text-sm text-gray-400">{category.percentage}% of total</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
