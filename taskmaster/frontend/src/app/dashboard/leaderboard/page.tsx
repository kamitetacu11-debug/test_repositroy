'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  TrendingUp,
  Users,
  Star,
  Flame,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { formatNumber, getRankColor } from '@/lib/utils';

const mockUsers = [
  { id: '1', name: 'John Doe', points: 5500, rank: 'EXPERT', level: 10, streak: 15, team: 'Frontend Team', avatar: null },
  { id: '2', name: 'Jane Smith', points: 3200, rank: 'SPECIALIST', level: 7, streak: 7, team: 'Backend Team', avatar: null },
  { id: '3', name: 'Bob Johnson', points: 1800, rank: 'APPRENTICE', level: 5, streak: 3, team: 'Frontend Team', avatar: null },
  { id: '4', name: 'Alice Brown', points: 2100, rank: 'SPECIALIST', level: 6, streak: 10, team: 'Backend Team', avatar: null },
  { id: '5', name: 'Charlie Wilson', points: 2800, rank: 'SPECIALIST', level: 7, streak: 5, team: 'Mobile Team', avatar: null },
  { id: '6', name: 'Diana Lee', points: 1500, rank: 'APPRENTICE', level: 4, streak: 2, team: 'Mobile Team', avatar: null },
  { id: '7', name: 'Eve Martinez', points: 900, rank: 'ROOKIE', level: 3, streak: 1, team: 'Frontend Team', avatar: null },
  { id: '8', name: 'Frank Garcia', points: 750, rank: 'ROOKIE', level: 2, streak: 0, team: 'Backend Team', avatar: null },
];

const mockTeams = [
  { id: '1', name: 'Frontend Team', points: 7300, members: 3 },
  { id: '2', name: 'Backend Team', points: 5300, members: 3 },
  { id: '3', name: 'Mobile Team', points: 4300, members: 2 },
];

type Period = 'weekly' | 'monthly' | 'all';
type Tab = 'users' | 'teams';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [tab, setTab] = useState<Tab>('users');

  const sortedUsers = [...mockUsers].sort((a, b) => b.points - a.points);
  const sortedTeams = [...mockTeams].sort((a, b) => b.points - a.points);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-gray-400" />;
      case 2: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-lg font-bold text-gray-500">#{position + 1}</span>;
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
                {p.charAt(0).toUpperCase() + p.slice(1)}
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
          <div className="flex flex-col items-center justify-end">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-400/20 border-4 border-gray-400 flex items-center justify-center text-2xl font-bold mb-2">
              {sortedUsers[1]?.name.charAt(0)}
            </div>
            <p className="font-medium text-center truncate w-full">{sortedUsers[1]?.name}</p>
            <p className="text-gray-400 text-sm">{formatNumber(sortedUsers[1]?.points || 0)} pts</p>
            <div className="w-full h-24 bg-gray-400/20 rounded-t-xl mt-2 flex items-center justify-center">
              <Medal className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center justify-end">
            <Crown className="w-8 h-8 text-yellow-500 mb-2 animate-bounce" />
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-yellow-500/20 border-4 border-yellow-500 flex items-center justify-center text-3xl font-bold mb-2">
              {sortedUsers[0]?.name.charAt(0)}
            </div>
            <p className="font-medium text-center truncate w-full">{sortedUsers[0]?.name}</p>
            <p className="text-yellow-500 font-bold">{formatNumber(sortedUsers[0]?.points || 0)} pts</p>
            <div className="w-full h-32 bg-yellow-500/20 rounded-t-xl mt-2 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-yellow-500" />
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center justify-end">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-amber-600/20 border-4 border-amber-600 flex items-center justify-center text-2xl font-bold mb-2">
              {sortedUsers[2]?.name.charAt(0)}
            </div>
            <p className="font-medium text-center truncate w-full">{sortedUsers[2]?.name}</p>
            <p className="text-gray-400 text-sm">{formatNumber(sortedUsers[2]?.points || 0)} pts</p>
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
                      className="flex items-center gap-4 p-4 hover:bg-glass-light transition"
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
                        <p className="font-bold text-cosmic-purple">{formatNumber(user.points)}</p>
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
                      className="flex items-center gap-4 p-4 hover:bg-glass-light transition"
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

                      <div className="text-right">
                        <p className="font-bold text-cosmic-purple">{formatNumber(team.points)}</p>
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
    </DashboardLayout>
  );
}
