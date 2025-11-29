'use client';

import { motion } from 'framer-motion';
import {
  User,
  Trophy,
  Star,
  Flame,
  Target,
  Calendar,
  Award,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import { formatNumber, getRankColor } from '@/lib/utils';

const achievements = [
  { name: 'Task Master', description: 'Complete 50 tasks', icon: '✅', unlocked: true, date: '2024-11-15' },
  { name: 'Streak Legend', description: '7-day streak', icon: '🔥', unlocked: true, date: '2024-11-20' },
  { name: 'Point Collector', description: 'Earn 1,000 points', icon: '💰', unlocked: true, date: '2024-11-10' },
  { name: 'Team Player', description: 'Complete 10 team tasks', icon: '👥', unlocked: true, date: '2024-11-18' },
  { name: 'Early Bird', description: 'Complete task before 9 AM', icon: '🌅', unlocked: false, date: null },
  { name: 'Perfectionist', description: '100% completion rate for a week', icon: '💎', unlocked: false, date: null },
];

const activityHistory = [
  { action: 'Completed task', details: 'Design dashboard UI', points: 40, time: '2 hours ago' },
  { action: 'Achievement unlocked', details: 'Team Player', points: 100, time: '5 hours ago' },
  { action: 'Completed task', details: 'Review pull requests', points: 20, time: '1 day ago' },
  { action: 'Level up', details: 'Reached level 10', points: 0, time: '2 days ago' },
  { action: 'Completed task', details: 'Setup CI/CD pipeline', points: 60, time: '3 days ago' },
];

export default function ProfilePage() {
  const { user } = useAuthStore();

  const mockUser = {
    firstName: user?.firstName || 'Admin',
    lastName: user?.lastName || 'User',
    email: user?.email || 'admin@taskmaster.io',
    role: user?.role || 'ADMIN',
    totalPoints: user?.totalPoints || 10000,
    currentLevel: user?.currentLevel || 15,
    currentRank: user?.currentRank || 'MASTER',
    streak: 15,
    tasksCompleted: 127,
    teamName: 'Engineering',
    joinDate: '2024-01-15',
  };

  const levelProgress = 75; // percentage to next level
  const nextLevelPoints = 12000;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-cosmic-purple via-cosmic-blue to-cosmic-cyan" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-16">
                <div className="w-32 h-32 rounded-full bg-cosmic-dark border-4 border-cosmic-purple flex items-center justify-center text-4xl font-bold">
                  {mockUser.firstName.charAt(0)}{mockUser.lastName.charAt(0)}
                </div>
                <div className="flex-1 text-center md:text-left pb-4">
                  <h1 className="text-2xl font-bold">{mockUser.firstName} {mockUser.lastName}</h1>
                  <p className="text-gray-400">{mockUser.email}</p>
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: `${getRankColor(mockUser.currentRank)}20`, color: getRankColor(mockUser.currentRank) }}
                    >
                      {mockUser.currentRank}
                    </span>
                    <span className="text-gray-400">Level {mockUser.currentLevel}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-400">{mockUser.teamName}</span>
                  </div>
                </div>
                <div className="text-center pb-4">
                  <p className="text-3xl font-bold text-cosmic-purple">{formatNumber(mockUser.totalPoints)}</p>
                  <p className="text-gray-400">Total Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Tasks Completed', value: mockUser.tasksCompleted, icon: Target, color: 'text-status-success' },
            { label: 'Current Streak', value: `${mockUser.streak}d`, icon: Flame, color: 'text-orange-500' },
            { label: 'Achievements', value: achievements.filter(a => a.unlocked).length, icon: Award, color: 'text-yellow-500' },
            { label: 'Member Since', value: 'Jan 2024', icon: Calendar, color: 'text-cosmic-cyan' },
          ].map((stat, i) => (
            <Card key={i} className="glass">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-glass-light flex items-center justify-center">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <p className="text-xs text-gray-400">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Level Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cosmic-purple" />
                  Level Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">Level {mockUser.currentLevel}</span>
                  <span className="text-gray-400">Level {mockUser.currentLevel + 1}</span>
                </div>
                <div className="h-4 bg-glass-light rounded-full overflow-hidden mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-cosmic-purple to-cosmic-cyan rounded-full"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{formatNumber(mockUser.totalPoints)} XP</span>
                  <span>{formatNumber(nextLevelPoints)} XP</span>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-glass-light">
                  <p className="text-sm text-gray-400 mb-2">Next rank unlock at:</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl" style={{ color: getRankColor('GRANDMASTER') }}>GRANDMASTER</span>
                    <span className="text-gray-400">— 35,000 points</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {achievements.map((achievement, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl text-center transition ${
                        achievement.unlocked
                          ? 'bg-glass-light hover:bg-glass-medium cursor-pointer'
                          : 'bg-glass-light/50 opacity-50'
                      }`}
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <p className="text-xs font-medium mt-1 truncate">{achievement.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Activity History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityHistory.map((activity, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-glass-light transition">
                    <div className="w-10 h-10 rounded-full bg-cosmic-purple/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-cosmic-purple" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-gray-400">{activity.details}</p>
                    </div>
                    {activity.points > 0 && (
                      <span className="text-cosmic-purple font-medium">+{activity.points} pts</span>
                    )}
                    <span className="text-sm text-gray-400">{activity.time}</span>
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
