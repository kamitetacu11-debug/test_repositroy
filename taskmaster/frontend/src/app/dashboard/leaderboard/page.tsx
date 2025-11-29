'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  Users,
  Star,
  Flame,
  X,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { formatNumber, getRankColor } from '@/lib/utils';

interface UserTask {
  id: string;
  title: string;
  status: 'completed' | 'in_progress';
  points: number;
  category: string;
}

interface User {
  id: string;
  name: string;
  points: number;
  weeklyPoints: number;
  monthlyPoints: number;
  rank: string;
  level: number;
  streak: number;
  team: string;
  avatar: null;
  completedTasks: number;
  inProgressTasks: number;
  tasks: UserTask[];
  joinedDate: string;
  achievements: string[];
}

interface Team {
  id: string;
  name: string;
  points: number;
  weeklyPoints: number;
  monthlyPoints: number;
  members: number;
  membersList: string[];
  completedTasks: number;
  inProgressTasks: number;
  description: string;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    points: 5500,
    weeklyPoints: 850,
    monthlyPoints: 2200,
    rank: 'EXPERT',
    level: 10,
    streak: 15,
    team: 'Frontend Team',
    avatar: null,
    completedTasks: 47,
    inProgressTasks: 3,
    joinedDate: 'Jan 2024',
    achievements: ['Task Master', 'Team Player', 'Streak King'],
    tasks: [
      { id: 'T-201', title: 'Implement user dashboard', status: 'completed', points: 45, category: 'Development' },
      { id: 'T-202', title: 'Fix navigation bugs', status: 'completed', points: 30, category: 'Development' },
      { id: 'T-203', title: 'Optimize performance', status: 'in_progress', points: 50, category: 'Development' },
      { id: 'T-204', title: 'Add dark mode support', status: 'completed', points: 35, category: 'Design' },
      { id: 'T-205', title: 'Write unit tests', status: 'in_progress', points: 40, category: 'Testing' },
    ],
  },
  {
    id: '2',
    name: 'Jane Smith',
    points: 3200,
    weeklyPoints: 620,
    monthlyPoints: 1500,
    rank: 'SPECIALIST',
    level: 7,
    streak: 7,
    team: 'Backend Team',
    avatar: null,
    completedTasks: 35,
    inProgressTasks: 2,
    joinedDate: 'Feb 2024',
    achievements: ['API Expert', 'Bug Hunter'],
    tasks: [
      { id: 'T-301', title: 'Design REST API', status: 'completed', points: 50, category: 'Development' },
      { id: 'T-302', title: 'Database optimization', status: 'completed', points: 45, category: 'Development' },
      { id: 'T-303', title: 'Setup CI/CD', status: 'in_progress', points: 40, category: 'Development' },
    ],
  },
  {
    id: '3',
    name: 'Bob Johnson',
    points: 1800,
    weeklyPoints: 320,
    monthlyPoints: 900,
    rank: 'APPRENTICE',
    level: 5,
    streak: 3,
    team: 'Frontend Team',
    avatar: null,
    completedTasks: 22,
    inProgressTasks: 4,
    joinedDate: 'Mar 2024',
    achievements: ['Quick Learner'],
    tasks: [
      { id: 'T-401', title: 'Create component library', status: 'completed', points: 35, category: 'Development' },
      { id: 'T-402', title: 'Responsive design fixes', status: 'in_progress', points: 25, category: 'Design' },
    ],
  },
  {
    id: '4',
    name: 'Alice Brown',
    points: 2100,
    weeklyPoints: 450,
    monthlyPoints: 1100,
    rank: 'SPECIALIST',
    level: 6,
    streak: 10,
    team: 'Backend Team',
    avatar: null,
    completedTasks: 28,
    inProgressTasks: 1,
    joinedDate: 'Feb 2024',
    achievements: ['Consistent Performer', 'Team Helper'],
    tasks: [
      { id: 'T-501', title: 'Implement auth service', status: 'completed', points: 55, category: 'Development' },
      { id: 'T-502', title: 'Security audit', status: 'in_progress', points: 60, category: 'Testing' },
    ],
  },
  {
    id: '5',
    name: 'Charlie Wilson',
    points: 2800,
    weeklyPoints: 580,
    monthlyPoints: 1400,
    rank: 'SPECIALIST',
    level: 7,
    streak: 5,
    team: 'Mobile Team',
    avatar: null,
    completedTasks: 32,
    inProgressTasks: 2,
    joinedDate: 'Jan 2024',
    achievements: ['Mobile Expert', 'Cross-Platform Champion'],
    tasks: [
      { id: 'T-601', title: 'Build iOS app', status: 'completed', points: 70, category: 'Development' },
      { id: 'T-602', title: 'Android optimization', status: 'in_progress', points: 45, category: 'Development' },
    ],
  },
  {
    id: '6',
    name: 'Diana Lee',
    points: 1500,
    weeklyPoints: 280,
    monthlyPoints: 750,
    rank: 'APPRENTICE',
    level: 4,
    streak: 2,
    team: 'Mobile Team',
    avatar: null,
    completedTasks: 18,
    inProgressTasks: 3,
    joinedDate: 'Apr 2024',
    achievements: ['Rising Star'],
    tasks: [
      { id: 'T-701', title: 'UI animations', status: 'completed', points: 30, category: 'Design' },
      { id: 'T-702', title: 'Push notifications', status: 'in_progress', points: 35, category: 'Development' },
    ],
  },
  {
    id: '7',
    name: 'Eve Martinez',
    points: 900,
    weeklyPoints: 180,
    monthlyPoints: 450,
    rank: 'ROOKIE',
    level: 3,
    streak: 1,
    team: 'Frontend Team',
    avatar: null,
    completedTasks: 12,
    inProgressTasks: 2,
    joinedDate: 'May 2024',
    achievements: ['First Steps'],
    tasks: [
      { id: 'T-801', title: 'Update landing page', status: 'completed', points: 25, category: 'Design' },
      { id: 'T-802', title: 'Fix CSS issues', status: 'in_progress', points: 20, category: 'Development' },
    ],
  },
  {
    id: '8',
    name: 'Frank Garcia',
    points: 750,
    weeklyPoints: 150,
    monthlyPoints: 380,
    rank: 'ROOKIE',
    level: 2,
    streak: 0,
    team: 'Backend Team',
    avatar: null,
    completedTasks: 8,
    inProgressTasks: 1,
    joinedDate: 'May 2024',
    achievements: [],
    tasks: [
      { id: 'T-901', title: 'Setup dev environment', status: 'completed', points: 15, category: 'Documentation' },
      { id: 'T-902', title: 'API documentation', status: 'in_progress', points: 20, category: 'Documentation' },
    ],
  },
];

const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Frontend Team',
    points: 7300,
    weeklyPoints: 1350,
    monthlyPoints: 3650,
    members: 3,
    membersList: ['John Doe', 'Bob Johnson', 'Eve Martinez'],
    completedTasks: 81,
    inProgressTasks: 9,
    description: 'Building beautiful user interfaces',
  },
  {
    id: '2',
    name: 'Backend Team',
    points: 5300,
    weeklyPoints: 1100,
    monthlyPoints: 2730,
    members: 3,
    membersList: ['Jane Smith', 'Alice Brown', 'Frank Garcia'],
    completedTasks: 71,
    inProgressTasks: 4,
    description: 'Powering the application with robust APIs',
  },
  {
    id: '3',
    name: 'Mobile Team',
    points: 4300,
    weeklyPoints: 860,
    monthlyPoints: 2150,
    members: 2,
    membersList: ['Charlie Wilson', 'Diana Lee'],
    completedTasks: 50,
    inProgressTasks: 5,
    description: 'Creating seamless mobile experiences',
  },
];

type Period = 'weekly' | 'monthly' | 'all';
type Tab = 'users' | 'teams';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [tab, setTab] = useState<Tab>('users');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const sortedUsers = useMemo(() => {
    return [...mockUsers].sort((a, b) => {
      switch (period) {
        case 'weekly':
          return b.weeklyPoints - a.weeklyPoints;
        case 'monthly':
          return b.monthlyPoints - a.monthlyPoints;
        default:
          return b.points - a.points;
      }
    });
  }, [period]);

  const sortedTeams = useMemo(() => {
    return [...mockTeams].sort((a, b) => {
      switch (period) {
        case 'weekly':
          return b.weeklyPoints - a.weeklyPoints;
        case 'monthly':
          return b.monthlyPoints - a.monthlyPoints;
        default:
          return b.points - a.points;
      }
    });
  }, [period]);

  const getPoints = (item: User | Team) => {
    switch (period) {
      case 'weekly':
        return item.weeklyPoints;
      case 'monthly':
        return item.monthlyPoints;
      default:
        return item.points;
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-gray-400" />;
      case 2: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-lg font-bold text-gray-500">#{position + 1}</span>;
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'weekly':
        return 'This Week';
      case 'monthly':
        return 'This Month';
      default:
        return 'All Time';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Leaderboard
            </h1>
            <p className="text-gray-400 mt-1">See who's leading the pack</p>
          </div>

          {/* Period Filter */}
          <div className="flex gap-2">
            {(['weekly', 'monthly', 'all'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                onClick={() => setPeriod(p)}
                className={period === p ? 'bg-cosmic-purple' : ''}
              >
                {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4"
        >
          {/* 2nd Place */}
          <div
            className="flex flex-col items-center justify-end cursor-pointer"
            onClick={() => tab === 'users' ? setSelectedUser(sortedUsers[1]) : setSelectedTeam(sortedTeams[1])}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-400/20 border-4 border-gray-400 flex items-center justify-center text-2xl font-bold mb-2 hover:scale-105 transition-transform">
              {tab === 'users'
                ? sortedUsers[1]?.name.charAt(0)
                : <Users className="w-8 h-8 text-gray-400" />
              }
            </div>
            <p className="font-medium text-center truncate w-full">
              {tab === 'users' ? sortedUsers[1]?.name : sortedTeams[1]?.name}
            </p>
            <p className="text-gray-400 text-sm">
              {formatNumber(tab === 'users' ? getPoints(sortedUsers[1]) : getPoints(sortedTeams[1]))} pts
            </p>
            <div className="w-full h-24 bg-gray-400/20 rounded-t-xl mt-2 flex items-center justify-center">
              <Medal className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          {/* 1st Place */}
          <div
            className="flex flex-col items-center justify-end cursor-pointer"
            onClick={() => tab === 'users' ? setSelectedUser(sortedUsers[0]) : setSelectedTeam(sortedTeams[0])}
          >
            <Crown className="w-8 h-8 text-yellow-500 mb-2 animate-bounce" />
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-yellow-500/20 border-4 border-yellow-500 flex items-center justify-center text-3xl font-bold mb-2 hover:scale-105 transition-transform">
              {tab === 'users'
                ? sortedUsers[0]?.name.charAt(0)
                : <Users className="w-10 h-10 text-yellow-500" />
              }
            </div>
            <p className="font-medium text-center truncate w-full">
              {tab === 'users' ? sortedUsers[0]?.name : sortedTeams[0]?.name}
            </p>
            <p className="text-yellow-500 font-bold">
              {formatNumber(tab === 'users' ? getPoints(sortedUsers[0]) : getPoints(sortedTeams[0]))} pts
            </p>
            <div className="w-full h-32 bg-yellow-500/20 rounded-t-xl mt-2 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-yellow-500" />
            </div>
          </div>

          {/* 3rd Place */}
          <div
            className="flex flex-col items-center justify-end cursor-pointer"
            onClick={() => tab === 'users' ? setSelectedUser(sortedUsers[2]) : setSelectedTeam(sortedTeams[2])}
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-amber-600/20 border-4 border-amber-600 flex items-center justify-center text-2xl font-bold mb-2 hover:scale-105 transition-transform">
              {tab === 'users'
                ? sortedUsers[2]?.name.charAt(0)
                : <Users className="w-8 h-8 text-amber-600" />
              }
            </div>
            <p className="font-medium text-center truncate w-full">
              {tab === 'users' ? sortedUsers[2]?.name : sortedTeams[2]?.name}
            </p>
            <p className="text-gray-400 text-sm">
              {formatNumber(tab === 'users' ? getPoints(sortedUsers[2]) : getPoints(sortedTeams[2]))} pts
            </p>
            <div className="w-full h-20 bg-amber-600/20 rounded-t-xl mt-2 flex items-center justify-center">
              <Medal className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2"
        >
          <Button
            variant={tab === 'users' ? 'default' : 'outline'}
            onClick={() => setTab('users')}
            className={tab === 'users' ? 'bg-cosmic-purple' : ''}
          >
            <Star className="mr-2 w-4 h-4" />
            Individuals
          </Button>
          <Button
            variant={tab === 'teams' ? 'default' : 'outline'}
            onClick={() => setTab('teams')}
            className={tab === 'teams' ? 'bg-cosmic-purple' : ''}
          >
            <Users className="mr-2 w-4 h-4" />
            Teams
          </Button>
        </motion.div>

        {/* Leaderboard List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass">
            <CardContent className="p-0">
              <div className="divide-y divide-glass-border">
                {tab === 'users' ? (
                  sortedUsers.map((user, i) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      onClick={() => setSelectedUser(user)}
                      className="flex items-center gap-4 p-4 hover:bg-glass-light transition cursor-pointer"
                    >
                      <div className="w-10 flex items-center justify-center">
                        {getRankIcon(i)}
                      </div>

                      <div className="w-10 h-10 rounded-full bg-cosmic-purple/30 flex items-center justify-center font-medium">
                        {user.name.charAt(0)}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-400">{user.team}</p>
                      </div>

                      <div className="hidden md:flex items-center gap-4">
                        <div className="flex items-center gap-1 text-orange-500">
                          <Flame className="w-4 h-4" />
                          <span className="text-sm">{user.streak}d</span>
                        </div>
                        <div className="text-sm text-gray-400">Lvl {user.level}</div>
                        <div
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${getRankColor(user.rank)}20`, color: getRankColor(user.rank) }}
                        >
                          {user.rank}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-cosmic-purple">{formatNumber(getPoints(user))}</p>
                        <p className="text-xs text-gray-400">points</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  sortedTeams.map((team, i) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      onClick={() => setSelectedTeam(team)}
                      className="flex items-center gap-4 p-4 hover:bg-glass-light transition cursor-pointer"
                    >
                      <div className="w-10 flex items-center justify-center">
                        {getRankIcon(i)}
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-cosmic-purple/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-cosmic-purple" />
                      </div>

                      <div className="flex-1">
                        <p className="font-medium">{team.name}</p>
                        <p className="text-sm text-gray-400">{team.members} members</p>
                      </div>

                      <div className="hidden md:flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <CheckCircle2 className="w-4 h-4 text-status-success" />
                          <span>{team.completedTasks} done</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4 text-cosmic-cyan" />
                          <span>{team.inProgressTasks} active</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-cosmic-purple">{formatNumber(getPoints(team))}</p>
                        <p className="text-xs text-gray-400">points</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* User Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
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
              onClick={() => setSelectedUser(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-glass-border bg-cosmic-dark/95 shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-glass-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                      style={{ backgroundColor: `${getRankColor(selectedUser.rank)}20`, color: getRankColor(selectedUser.rank) }}
                    >
                      {selectedUser.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedUser.name}</h2>
                      <p className="text-sm text-gray-400">{selectedUser.team}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${getRankColor(selectedUser.rank)}20`, color: getRankColor(selectedUser.rank) }}
                        >
                          {selectedUser.rank}
                        </div>
                        <span className="text-xs text-gray-400">Level {selectedUser.level}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">Joined {selectedUser.joinedDate}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 rounded-lg hover:bg-glass-light transition"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 rounded-xl bg-glass-light">
                    <Zap className="w-5 h-5 text-cosmic-purple mx-auto mb-1" />
                    <p className="text-lg font-bold">{formatNumber(selectedUser.points)}</p>
                    <p className="text-xs text-gray-400">Total Points</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-glass-light">
                    <CheckCircle2 className="w-5 h-5 text-status-success mx-auto mb-1" />
                    <p className="text-lg font-bold">{selectedUser.completedTasks}</p>
                    <p className="text-xs text-gray-400">Completed</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-glass-light">
                    <Clock className="w-5 h-5 text-cosmic-cyan mx-auto mb-1" />
                    <p className="text-lg font-bold">{selectedUser.inProgressTasks}</p>
                    <p className="text-xs text-gray-400">In Progress</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-glass-light">
                    <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{selectedUser.streak}d</p>
                    <p className="text-xs text-gray-400">Streak</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-280px)]">
                {/* Achievements */}
                {selectedUser.achievements.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Achievements</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.achievements.map((achievement, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-500"
                        >
                          <Trophy className="w-4 h-4" />
                          <span className="text-sm font-medium">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Tasks</h3>
                  <div className="space-y-2">
                    {selectedUser.tasks.map((task, idx) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-glass-light"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-status-success flex-shrink-0" />
                        ) : (
                          <Clock className="w-5 h-5 text-cosmic-cyan flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.title}</p>
                          <p className="text-xs text-gray-400">{task.category}</p>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded bg-cosmic-purple/20 text-cosmic-purple text-sm">
                          <Zap className="w-3 h-3" />
                          <span>{task.points}</span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            task.status === 'completed'
                              ? 'bg-status-success/20 text-status-success'
                              : 'bg-cosmic-cyan/20 text-cosmic-cyan'
                          }`}
                        >
                          {task.status === 'completed' ? 'Done' : 'In Progress'}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-glass-border bg-glass-light/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <TrendingUp className="w-4 h-4 text-status-success" />
                    <span>{getPeriodLabel()}: {formatNumber(getPoints(selectedUser))} points</span>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Profile Modal */}
      <AnimatePresence>
        {selectedTeam && (
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
              onClick={() => setSelectedTeam(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-glass-border bg-cosmic-dark/95 shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-glass-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-cosmic-purple/20 flex items-center justify-center">
                      <Users className="w-8 h-8 text-cosmic-purple" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedTeam.name}</h2>
                      <p className="text-sm text-gray-400">{selectedTeam.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{selectedTeam.members} team members</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTeam(null)}
                    className="p-2 rounded-lg hover:bg-glass-light transition"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="text-center p-3 rounded-xl bg-glass-light">
                    <Zap className="w-5 h-5 text-cosmic-purple mx-auto mb-1" />
                    <p className="text-lg font-bold">{formatNumber(selectedTeam.points)}</p>
                    <p className="text-xs text-gray-400">Total Points</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-glass-light">
                    <Target className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">{formatNumber(selectedTeam.weeklyPoints)}</p>
                    <p className="text-xs text-gray-400">This Week</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-glass-light">
                    <CheckCircle2 className="w-5 h-5 text-status-success mx-auto mb-1" />
                    <p className="text-lg font-bold">{selectedTeam.completedTasks}</p>
                    <p className="text-xs text-gray-400">Completed</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-glass-light">
                    <Clock className="w-5 h-5 text-cosmic-cyan mx-auto mb-1" />
                    <p className="text-lg font-bold">{selectedTeam.inProgressTasks}</p>
                    <p className="text-xs text-gray-400">In Progress</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-280px)]">
                {/* Team Members */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Team Members</h3>
                  <div className="space-y-2">
                    {selectedTeam.membersList.map((memberName, idx) => {
                      const member = mockUsers.find(u => u.name === memberName);
                      if (!member) return null;
                      return (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => {
                            setSelectedTeam(null);
                            setTimeout(() => setSelectedUser(member), 100);
                          }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-glass-light hover:bg-glass-medium transition-colors cursor-pointer"
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                            style={{ backgroundColor: `${getRankColor(member.rank)}20`, color: getRankColor(member.rank) }}
                          >
                            {member.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{member.name}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: `${getRankColor(member.rank)}20`, color: getRankColor(member.rank) }}
                              >
                                {member.rank}
                              </span>
                              <span className="text-xs text-gray-400">Lvl {member.level}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-orange-500">
                              <Flame className="w-4 h-4" />
                              <span className="text-sm">{member.streak}d</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-cosmic-purple">{formatNumber(member.points)}</p>
                              <p className="text-xs text-gray-400">points</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-glass-border bg-glass-light/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <TrendingUp className="w-4 h-4 text-status-success" />
                    <span>{getPeriodLabel()}: {formatNumber(getPoints(selectedTeam))} points</span>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedTeam(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
