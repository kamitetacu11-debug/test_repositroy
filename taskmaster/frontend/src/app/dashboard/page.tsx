'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Trophy,
  TrendingUp,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  Flame,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { formatNumber, getRankColor } from '@/lib/utils';

// Mock data for demo
const mockStats = {
  tasksCompleted: 47,
  tasksInProgress: 5,
  totalPoints: 5500,
  weeklyPoints: 340,
  streak: 15,
  rank: 'EXPERT',
  level: 10,
  weeklyChange: 12,
};

const mockTasks = [
  { id: '1', title: 'Design dashboard UI', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-12-02' },
  { id: '2', title: 'Implement API endpoints', status: 'TODO', priority: 'CRITICAL', dueDate: '2024-12-01' },
  { id: '3', title: 'Write unit tests', status: 'TODO', priority: 'MEDIUM', dueDate: '2024-12-03' },
  { id: '4', title: 'Review pull requests', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-12-01' },
];

const mockLeaderboard = [
  { name: 'John Doe', points: 5500, rank: 'EXPERT', avatar: null },
  { name: 'Jane Smith', points: 3200, rank: 'SPECIALIST', avatar: null },
  { name: 'Bob Johnson', points: 1800, rank: 'APPRENTICE', avatar: null },
];

const mockAchievements = [
  { name: 'Task Master', description: 'Complete 50 tasks', icon: '✅', unlocked: true },
  { name: 'Streak Legend', description: '7-day streak', icon: '🔥', unlocked: true },
  { name: 'Point Collector', description: '1,000 points', icon: '💰', unlocked: true },
];

export default function DashboardPage() {
  const { user, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back, <span className="gradient-text">{user?.firstName || 'User'}</span>
            </h1>
            <p className="text-gray-400 mt-1">Here's what's happening with your tasks today.</p>
          </div>
          <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
            <Target className="mr-2 w-4 h-4" />
            New Task
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Tasks Completed</p>
                  <p className="text-3xl font-bold mt-1">{mockStats.tasksCompleted}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-status-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-status-success" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm">
                <ArrowUp className="w-4 h-4 text-status-success" />
                <span className="text-status-success">+8</span>
                <span className="text-gray-400">this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Points</p>
                  <p className="text-3xl font-bold mt-1">{formatNumber(mockStats.totalPoints)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cosmic-purple/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-cosmic-purple" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm">
                <ArrowUp className="w-4 h-4 text-status-success" />
                <span className="text-status-success">+{mockStats.weeklyPoints}</span>
                <span className="text-gray-400">this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Current Streak</p>
                  <p className="text-3xl font-bold mt-1">{mockStats.streak} days</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-gray-400">Keep it going!</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Current Rank</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: getRankColor(mockStats.rank) }}>
                    {mockStats.rank}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm">
                <TrendingUp className="w-4 h-4 text-cosmic-cyan" />
                <span className="text-gray-400">Level {mockStats.level}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Active Tasks</CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === 'CRITICAL' ? 'bg-status-error' :
                          task.priority === 'HIGH' ? 'bg-orange-500' :
                          'bg-status-info'
                        }`} />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                            <Clock className="w-4 h-4" />
                            <span>Due {task.dueDate}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === 'IN_PROGRESS' ? 'bg-cosmic-blue/20 text-cosmic-blue' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Leaderboard */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockLeaderboard.map((user, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-glass-light">
                      <span className="text-lg font-bold text-gray-500 w-6">#{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-cosmic-purple/30 flex items-center justify-center text-sm font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-gray-400">{formatNumber(user.points)} pts</p>
                      </div>
                      <span className="text-xs font-medium" style={{ color: getRankColor(user.rank) }}>
                        {user.rank}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-cosmic-purple" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAchievements.map((achievement, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-glass-light">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{achievement.name}</p>
                        <p className="text-xs text-gray-400">{achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
