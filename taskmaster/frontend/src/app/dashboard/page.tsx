'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Target,
  Trophy,
  TrendingUp,
  Zap,
  CheckCircle2,
  Clock,
  Star,
  Flame,
  ArrowUp,
  Users,
  BarChart3,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { TaskModal, Task } from '@/components/tasks/task-modal';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { useToast } from '@/components/ui/toast';
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

const initialTasks: Task[] = [
  { id: '1', title: 'Design dashboard UI', description: 'Create wireframes and mockups for the new dashboard interface.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-12-02', points: 40, assignee: 'John Doe', assigneeId: 'USR-001' },
  { id: '2', title: 'Implement API endpoints', description: 'Build REST API endpoints for the tasks module.', status: 'TODO', priority: 'CRITICAL', dueDate: '2024-12-01', points: 50, assignee: 'Jane Smith', assigneeId: 'USR-002' },
  { id: '3', title: 'Write unit tests', description: 'Achieve 80% test coverage for the authentication module.', status: 'TODO', priority: 'MEDIUM', dueDate: '2024-12-03', points: 30, assignee: 'Bob Johnson', assigneeId: 'USR-003' },
  { id: '4', title: 'Review pull requests', description: 'Review and provide feedback on pending pull requests.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-12-01', points: 20, assignee: 'John Doe', assigneeId: 'USR-001' },
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
  const { addToast } = useToast();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = (newTask: Omit<Task, 'id'>) => {
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
    };
    setTasks([task, ...tasks]);
    addToast({
      type: 'success',
      title: 'Task Created',
      message: `"${task.title}" has been created successfully.`,
    });
  };

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(updatedTask);
    addToast({
      type: 'success',
      title: 'Task Updated',
      message: 'Task has been updated successfully.',
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
    setIsTaskModalOpen(false);
    addToast({
      type: 'success',
      title: 'Task Deleted',
      message: `"${task?.title}" has been deleted.`,
    });
  };

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTask({ ...task, status: newStatus });
    }
    addToast({
      type: newStatus === 'COMPLETED' ? 'success' : 'info',
      title: 'Status Updated',
      message: newStatus === 'COMPLETED' ? 'Task marked as complete!' : 'Task status updated.',
    });
  };

  // Filter to show only active tasks (not completed)
  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED');

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
            <p className="text-gray-400 mt-1">Here&apos;s what&apos;s happening with your tasks today.</p>
          </div>
          <Button
            className="bg-cosmic-purple hover:bg-cosmic-purple/80"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Target className="mr-2 w-4 h-4" />
            New Task
          </Button>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="glass border-cosmic-purple/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-cosmic-purple" />
                <span className="text-sm font-medium text-gray-400">Quick Actions</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </Button>
                <Link href="/dashboard/tasks">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Target className="w-4 h-4" />
                    My Tasks
                  </Button>
                </Link>
                <Link href="/dashboard/teams">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Users className="w-4 h-4" />
                    My Team
                  </Button>
                </Link>
                <Link href="/dashboard/analytics">
                  <Button variant="outline" size="sm" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Link href="/dashboard/tasks?status=COMPLETED">
            <Card className="glass-card hover:border-status-success/50 transition-all cursor-pointer">
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
          </Link>

          <Link href="/dashboard/leaderboard">
            <Card className="glass-card hover:border-cosmic-purple/50 transition-all cursor-pointer">
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
          </Link>

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

          <Link href="/dashboard/leaderboard">
            <Card className="glass-card hover:border-yellow-500/50 transition-all cursor-pointer">
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
          </Link>
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
                <Link href="/dashboard/tasks">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-status-success" />
                      </div>
                      <p className="text-gray-400">All tasks completed!</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Task
                      </Button>
                    </div>
                  ) : (
                    activeTasks.slice(0, 4).map((task, i) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-xl bg-glass-light hover:bg-glass-medium transition cursor-pointer group"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === 'CRITICAL' ? 'bg-status-error' :
                            task.priority === 'HIGH' ? 'bg-orange-500' :
                            'bg-status-info'
                          }`} />
                          <div>
                            <p className="font-medium group-hover:text-cosmic-purple transition">{task.title}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                              <Clock className="w-4 h-4" />
                              <span>Due {task.dueDate}</span>
                              <span className="text-cosmic-purple">+{task.points} pts</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            task.status === 'IN_PROGRESS' ? 'bg-cosmic-blue/20 text-cosmic-blue' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                      </motion.div>
                    ))
                  )}
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Leaderboard
                </CardTitle>
                <Link href="/dashboard/leaderboard">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockLeaderboard.map((leaderUser, i) => (
                    <Link href="/dashboard/leaderboard" key={i}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-glass-light hover:bg-glass-medium transition cursor-pointer">
                        <span className="text-lg font-bold text-gray-500 w-6">#{i + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-cosmic-purple/30 flex items-center justify-center text-sm font-medium">
                          {leaderUser.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{leaderUser.name}</p>
                          <p className="text-xs text-gray-400">{formatNumber(leaderUser.points)} pts</p>
                        </div>
                        <span className="text-xs font-medium" style={{ color: getRankColor(leaderUser.rank) }}>
                          {leaderUser.rank}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-cosmic-purple" />
                  Achievements
                </CardTitle>
                <Link href="/dashboard/profile">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockAchievements.map((achievement, i) => (
                    <Link href="/dashboard/profile" key={i}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-glass-light hover:bg-glass-medium transition cursor-pointer">
                        <span className="text-2xl">{achievement.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{achievement.name}</p>
                          <p className="text-xs text-gray-400">{achievement.description}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        onStatusChange={handleStatusChange}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
      />
    </DashboardLayout>
  );
}
