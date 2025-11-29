'use client';

import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Trophy,
  Target,
  TrendingUp,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { formatNumber, getRankColor } from '@/lib/utils';

const mockTeams = [
  {
    id: '1',
    name: 'Frontend Team',
    description: 'Web Frontend Development',
    members: [
      { name: 'John Doe', role: 'Team Lead', points: 5500, rank: 'EXPERT' },
      { name: 'Bob Johnson', role: 'Developer', points: 1800, rank: 'APPRENTICE' },
    ],
    totalPoints: 7300,
    weeklyPoints: 580,
    tasksCompleted: 23,
  },
  {
    id: '2',
    name: 'Backend Team',
    description: 'API & Infrastructure',
    members: [
      { name: 'Jane Smith', role: 'Team Lead', points: 3200, rank: 'SPECIALIST' },
      { name: 'Alice Brown', role: 'Developer', points: 2100, rank: 'SPECIALIST' },
    ],
    totalPoints: 5300,
    weeklyPoints: 420,
    tasksCompleted: 18,
  },
  {
    id: '3',
    name: 'Mobile Team',
    description: 'iOS & Android Development',
    members: [
      { name: 'Charlie Wilson', role: 'Team Lead', points: 2800, rank: 'SPECIALIST' },
      { name: 'Diana Lee', role: 'Developer', points: 1500, rank: 'APPRENTICE' },
    ],
    totalPoints: 4300,
    weeklyPoints: 340,
    tasksCompleted: 15,
  },
];

export default function TeamsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-gray-400 mt-1">Manage teams and track performance</p>
          </div>
          <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
            <Plus className="mr-2 w-4 h-4" />
            Create Team
          </Button>
        </motion.div>

        {/* Team Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { label: 'Total Teams', value: mockTeams.length, icon: Users, color: 'text-cosmic-purple' },
            { label: 'Total Members', value: mockTeams.reduce((acc, t) => acc + t.members.length, 0), icon: Target, color: 'text-cosmic-blue' },
            { label: 'Weekly Points', value: formatNumber(mockTeams.reduce((acc, t) => acc + t.weeklyPoints, 0)), icon: TrendingUp, color: 'text-status-success' },
          ].map((stat, i) => (
            <Card key={i} className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-glass-light flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockTeams.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Card className="glass hover:shadow-glow-purple/20 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-cosmic-purple/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-cosmic-purple" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <p className="text-sm text-gray-400">{team.description}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </CardHeader>

                <CardContent>
                  {/* Team Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-xl bg-glass-light">
                    <div className="text-center">
                      <p className="text-xl font-bold text-cosmic-purple">{formatNumber(team.totalPoints)}</p>
                      <p className="text-xs text-gray-400">Total Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-status-success">+{team.weeklyPoints}</p>
                      <p className="text-xs text-gray-400">This Week</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-cosmic-cyan">{team.tasksCompleted}</p>
                      <p className="text-xs text-gray-400">Tasks Done</p>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400 mb-2">Members ({team.members.length})</p>
                    {team.members.map((member, j) => (
                      <div key={j} className="flex items-center justify-between p-2 rounded-lg hover:bg-glass-light transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-cosmic-purple/30 flex items-center justify-center text-sm font-medium">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-gray-400">{member.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium" style={{ color: getRankColor(member.rank) }}>
                            {member.rank}
                          </p>
                          <p className="text-xs text-gray-400">{formatNumber(member.points)} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
