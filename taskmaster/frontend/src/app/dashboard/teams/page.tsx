'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Trophy,
  Target,
  TrendingUp,
  MoreVertical,
  X,
  Edit,
  Trash2,
  UserPlus,
  Settings,
  Mail,
  Calendar,
  Zap,
  CheckCircle2,
  Clock,
  Award,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  BarChart2,
  Swords,
  UserCheck,
  Shuffle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { useToast } from '@/components/ui/toast';
import { useSettingsStore } from '@/stores/settings.store';
import { useMessengerStore } from '@/stores/messenger.store';
import { formatNumber, getRankColor } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  points: number;
  rank: string;
  tasksCompleted: number;
  joinedDate: string;
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  totalPoints: number;
  weeklyPoints: number;
  tasksCompleted: number;
}

const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Frontend Team',
    description: 'Web Frontend Development',
    members: [
      { id: 'M1', name: 'John Doe', email: 'john@taskmaster.io', role: 'Team Lead', points: 5500, rank: 'EXPERT', tasksCompleted: 156, joinedDate: '2024-01-15' },
      { id: 'M2', name: 'Bob Johnson', email: 'bob@taskmaster.io', role: 'Developer', points: 1800, rank: 'APPRENTICE', tasksCompleted: 48, joinedDate: '2024-06-20' },
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
      { id: 'M3', name: 'Jane Smith', email: 'jane@taskmaster.io', role: 'Team Lead', points: 3200, rank: 'SPECIALIST', tasksCompleted: 89, joinedDate: '2024-02-10' },
      { id: 'M4', name: 'Alice Brown', email: 'alice@taskmaster.io', role: 'Developer', points: 2100, rank: 'SPECIALIST', tasksCompleted: 62, joinedDate: '2024-03-25' },
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
      { id: 'M5', name: 'Charlie Wilson', email: 'charlie@taskmaster.io', role: 'Team Lead', points: 2800, rank: 'SPECIALIST', tasksCompleted: 74, joinedDate: '2024-04-05' },
      { id: 'M6', name: 'Diana Lee', email: 'diana@taskmaster.io', role: 'Developer', points: 1500, rank: 'APPRENTICE', tasksCompleted: 41, joinedDate: '2024-07-15' },
    ],
    totalPoints: 4300,
    weeklyPoints: 340,
    tasksCompleted: 15,
  },
];

export default function TeamsPage() {
  const { addToast } = useToast();
  const { getCurrentTheme } = useSettingsStore();
  const currentTheme = getCurrentTheme();
  const t = useTranslation();
  const { findOrCreateUserByEmail, startChatWithUser, addTeam } = useMessengerStore();
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Developer' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Team settings state
  const [teamSettings, setTeamSettings] = useState({
    visibility: 'public' as 'public' | 'private',
    allowMemberInvites: true,
    requireApproval: false,
    weeklyGoal: 500,
    pointsMultiplier: 1,
    notifyOnTaskComplete: true,
    notifyOnAchievement: true,
    notifyOnMemberJoin: true,
    autoAssignTasks: false,
    showLeaderboard: true,
    allowCompetitions: true,
  });

  const handleCreateTeam = () => {
    const newErrors: Record<string, string> = {};
    if (!newTeam.name.trim()) newErrors.name = 'Team name is required';
    if (!newTeam.description.trim()) newErrors.description = 'Description is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const team: Team = {
      id: `T-${Date.now()}`,
      name: newTeam.name,
      description: newTeam.description,
      members: [],
      totalPoints: 0,
      weeklyPoints: 0,
      tasksCompleted: 0,
    };

    setTeams([...teams, team]);
    setShowCreateModal(false);
    setNewTeam({ name: '', description: '' });
    setErrors({});
    addToast({
      type: 'success',
      title: 'Team Created',
      message: `${team.name} has been created successfully.`,
    });
  };

  const handleEditTeam = () => {
    if (!selectedTeam) return;

    setTeams(teams.map(t =>
      t.id === selectedTeam.id ? selectedTeam : t
    ));
    setShowEditModal(false);
    addToast({
      type: 'success',
      title: 'Team Updated',
      message: `${selectedTeam.name} has been updated.`,
    });
  };

  const handleDeleteTeam = (team: Team) => {
    setTeams(teams.filter(t => t.id !== team.id));
    addToast({
      type: 'info',
      title: 'Team Deleted',
      message: `${team.name} has been removed.`,
    });
  };

  const handleAddMember = () => {
    if (!selectedTeam) return;

    const newErrors: Record<string, string> = {};
    if (!newMember.name.trim()) newErrors.memberName = 'Name is required';
    if (!newMember.email.trim()) newErrors.memberEmail = 'Email is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const member: TeamMember = {
      id: `M-${Date.now()}`,
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      points: 0,
      rank: 'NOVICE',
      tasksCompleted: 0,
      // Format date manually to avoid timezone issues with toISOString()
      joinedDate: (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      })(),
    };

    setTeams(teams.map(t =>
      t.id === selectedTeam.id
        ? { ...t, members: [...t.members, member] }
        : t
    ));
    setShowAddMemberModal(false);
    setNewMember({ name: '', email: '', role: 'Developer' });
    setErrors({});
    addToast({
      type: 'success',
      title: 'Member Added',
      message: `${member.name} has been added to ${selectedTeam.name}.`,
    });
  };

  const handleSaveSettings = () => {
    if (!selectedTeam) return;

    addToast({
      type: 'success',
      title: 'Settings Saved',
      message: `Settings for ${selectedTeam.name} have been updated.`,
    });
    setShowSettingsModal(false);
  };

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
            <h1 className="text-3xl font-bold">{t.teams.title}</h1>
            <p className="text-gray-400 mt-1">{t.teams.subtitle}</p>
          </div>
          <Button
            className="bg-cosmic-purple hover:bg-cosmic-purple/80"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="mr-2 w-4 h-4" />
            {t.teams.createTeam}
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
            { label: t.teams.totalTeams, value: teams.length, icon: Users, color: 'text-cosmic-purple' },
            { label: t.teams.totalMembers, value: teams.reduce((acc, tm) => acc + tm.members.length, 0), icon: Target, color: 'text-cosmic-blue' },
            { label: t.teams.weeklyPoints, value: formatNumber(teams.reduce((acc, tm) => acc + tm.weeklyPoints, 0)), icon: TrendingUp, color: 'text-status-success' },
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
          <AnimatePresence mode="popLayout">
          {teams.map((team, i) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 0.8,
                y: -20,
                transition: { duration: 0.3 }
              }}
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
                  <Dropdown
                    trigger={
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    }
                  >
                    <DropdownItem
                      icon={<Edit className="w-4 h-4" />}
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowEditModal(true);
                      }}
                    >
                      {t.teams.editTeam}
                    </DropdownItem>
                    <DropdownItem
                      icon={<UserPlus className="w-4 h-4" />}
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowAddMemberModal(true);
                      }}
                    >
                      {t.teams.addMember}
                    </DropdownItem>
                    <DropdownItem
                      icon={<Settings className="w-4 h-4" />}
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowSettingsModal(true);
                      }}
                    >
                      {t.teams.teamSettings}
                    </DropdownItem>
                    <DropdownDivider />
                    <DropdownItem
                      icon={<Trash2 className="w-4 h-4" />}
                      variant="danger"
                      onClick={() => handleDeleteTeam(team)}
                    >
                      {t.teams.deleteTeam}
                    </DropdownItem>
                  </Dropdown>
                </CardHeader>

                <CardContent>
                  {/* Team Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded-xl bg-glass-light">
                    <div className="text-center">
                      <p className="text-xl font-bold text-cosmic-purple">{formatNumber(team.totalPoints)}</p>
                      <p className="text-xs text-gray-400">{t.teams.totalPoints}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-status-success">+{team.weeklyPoints}</p>
                      <p className="text-xs text-gray-400">{t.teams.thisWeek}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-cosmic-cyan">{team.tasksCompleted}</p>
                      <p className="text-xs text-gray-400">{t.teams.tasksDone}</p>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-400 mb-2">{t.teams.members} ({team.members.length})</p>
                    {team.members.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t.teams.noMembersYet}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            setSelectedTeam(team);
                            setShowAddMemberModal(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          {t.teams.addFirstMember}
                        </Button>
                      </div>
                    ) : (
                      team.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-glass-light transition cursor-pointer"
                          onClick={() => {
                            setSelectedMember(member);
                            setSelectedTeam(team);
                            setShowMemberModal(true);
                          }}
                        >
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
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Team Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-glass-border shadow-2xl"
              style={{ backgroundColor: `${currentTheme.colors.background}f5` }}
            >
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${currentTheme.colors.primary}20` }}
                  >
                    <Users className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
                  </div>
                  <h2 className="text-xl font-semibold">{t.teams.createNewTeam}</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-glass-light transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">{t.teams.teamName} *</label>
                  <Input
                    value={newTeam.name}
                    onChange={(e) => {
                      setNewTeam({ ...newTeam, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    placeholder="e.g., Design Team"
                    className={errors.name ? 'border-status-error' : ''}
                  />
                  {errors.name && <p className="text-sm text-status-error">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">{t.teams.description} *</label>
                  <Textarea
                    value={newTeam.description}
                    onChange={(e) => {
                      setNewTeam({ ...newTeam, description: e.target.value });
                      if (errors.description) setErrors({ ...errors, description: '' });
                    }}
                    placeholder="What does this team do?"
                    className={errors.description ? 'border-status-error' : ''}
                  />
                  {errors.description && <p className="text-sm text-status-error">{errors.description}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-glass-border">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  {t.teams.cancel}
                </Button>
                <Button onClick={handleCreateTeam}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t.teams.createTeam}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Team Modal */}
      <AnimatePresence>
        {showEditModal && selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-glass-border shadow-2xl"
              style={{ backgroundColor: `${currentTheme.colors.background}f5` }}
            >
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${currentTheme.colors.secondary}20` }}
                  >
                    <Edit className="w-5 h-5" style={{ color: currentTheme.colors.secondary }} />
                  </div>
                  <h2 className="text-xl font-semibold">{t.teams.editTeam}</h2>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-lg hover:bg-glass-light transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">{t.teams.teamName}</label>
                  <Input
                    value={selectedTeam.name}
                    onChange={(e) => setSelectedTeam({ ...selectedTeam, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">{t.teams.description}</label>
                  <Textarea
                    value={selectedTeam.description}
                    onChange={(e) => setSelectedTeam({ ...selectedTeam, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-glass-border">
                <Button variant="ghost" onClick={() => setShowEditModal(false)}>
                  {t.teams.cancel}
                </Button>
                <Button onClick={handleEditTeam}>
                  {t.common.save}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMemberModal && selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddMemberModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl border border-glass-border shadow-2xl"
              style={{ backgroundColor: `${currentTheme.colors.background}f5` }}
            >
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-status-success/20 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-status-success" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{t.teams.addMember}</h2>
                    <p className="text-sm text-gray-400">{t.teams.to} {selectedTeam.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="p-2 rounded-lg hover:bg-glass-light transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">{t.teams.fullName} *</label>
                  <Input
                    value={newMember.name}
                    onChange={(e) => {
                      setNewMember({ ...newMember, name: e.target.value });
                      if (errors.memberName) setErrors({ ...errors, memberName: '' });
                    }}
                    placeholder="e.g., Alex Johnson"
                    className={errors.memberName ? 'border-status-error' : ''}
                  />
                  {errors.memberName && <p className="text-sm text-status-error">{errors.memberName}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">{t.teams.email} *</label>
                  <Input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => {
                      setNewMember({ ...newMember, email: e.target.value });
                      if (errors.memberEmail) setErrors({ ...errors, memberEmail: '' });
                    }}
                    placeholder="alex@company.com"
                    className={errors.memberEmail ? 'border-status-error' : ''}
                  />
                  {errors.memberEmail && <p className="text-sm text-status-error">{errors.memberEmail}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">{t.teams.role}</label>
                  <Input
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                    placeholder="e.g., Developer, Designer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-glass-border">
                <Button variant="ghost" onClick={() => setShowAddMemberModal(false)}>
                  {t.teams.cancel}
                </Button>
                <Button onClick={handleAddMember}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t.teams.addMember}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Details Modal */}
      <AnimatePresence>
        {showMemberModal && selectedMember && selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMemberModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-2xl border border-glass-border shadow-2xl"
              style={{ backgroundColor: `${currentTheme.colors.background}f5` }}
            >
              <div className="flex items-center justify-between p-6 border-b border-glass-border">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.secondary})` }}
                  >
                    {selectedMember.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedMember.name}</h2>
                    <p className="text-gray-400">{selectedMember.role} · {selectedTeam.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMemberModal(false)}
                  className="p-2 rounded-lg hover:bg-glass-light transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Contact Info */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-glass-light">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-300">{selectedMember.email}</span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-glass-light text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Zap className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
                      <span className="text-2xl font-bold" style={{ color: currentTheme.colors.primary }}>{formatNumber(selectedMember.points)}</span>
                    </div>
                    <p className="text-sm text-gray-400">{t.teams.totalPoints}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-glass-light text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-status-success" />
                      <span className="text-2xl font-bold text-status-success">{selectedMember.tasksCompleted}</span>
                    </div>
                    <p className="text-sm text-gray-400">{t.teams.tasksCompleted}</p>
                  </div>
                </div>

                {/* Rank & Join Date */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5" style={{ color: getRankColor(selectedMember.rank) }} />
                    <div>
                      <p className="font-medium" style={{ color: getRankColor(selectedMember.rank) }}>
                        {selectedMember.rank}
                      </p>
                      <p className="text-xs text-gray-400">{t.teams.currentRank}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div className="text-right">
                      <p className="font-medium">{new Date(selectedMember.joinedDate).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400">{t.teams.joinedDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-glass-border">
                <Button variant="ghost" onClick={() => setShowMemberModal(false)}>
                  {t.teams.close}
                </Button>
                <Button
                  onClick={() => {
                    if (selectedMember && selectedTeam) {
                      // Add team to messenger if it doesn't exist
                      const teamId = `team-${selectedTeam.id}`;
                      addTeam({ id: teamId, name: selectedTeam.name, description: selectedTeam.description || undefined });
                      // Find or create user in messenger by email with team association
                      const user = findOrCreateUserByEmail(selectedMember.email, selectedMember.name, teamId);
                      // Start chat with the user
                      startChatWithUser(user.id);
                      // Close the member modal
                      setShowMemberModal(false);
                      addToast({
                        type: 'success',
                        title: t.teams.chatOpened || 'Chat Opened',
                        message: `${t.teams.chatWith || 'Chat with'} ${selectedMember.name}`,
                      });
                    }
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t.teams.sendMessage}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSettingsModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-glass-border shadow-2xl"
              style={{ backgroundColor: `${currentTheme.colors.background}f5` }}
            >
              <div
                className="flex items-center justify-between p-6 border-b border-glass-border sticky top-0 backdrop-blur-sm z-10"
                style={{ backgroundColor: `${currentTheme.colors.background}f5` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${currentTheme.colors.primary}20` }}
                  >
                    <Settings className="w-5 h-5" style={{ color: currentTheme.colors.primary }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Team Settings</h2>
                    <p className="text-sm text-gray-400">{selectedTeam.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-lg hover:bg-glass-light transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Visibility Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    {teamSettings.visibility === 'public' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    Visibility & Access
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        {teamSettings.visibility === 'public' ? (
                          <Unlock className="w-5 h-5 text-status-success" />
                        ) : (
                          <Lock className="w-5 h-5 text-status-warning" />
                        )}
                        <div>
                          <p className="font-medium">Team Visibility</p>
                          <p className="text-sm text-gray-400">
                            {teamSettings.visibility === 'public' ? 'Anyone can find and request to join' : 'Only invited members can join'}
                          </p>
                        </div>
                      </div>
                      <select
                        value={teamSettings.visibility}
                        onChange={(e) => setTeamSettings({ ...teamSettings, visibility: e.target.value as 'public' | 'private' })}
                        className="px-3 py-2 rounded-lg bg-cosmic-dark border border-glass-border text-sm"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-cosmic-cyan" />
                        <div>
                          <p className="font-medium">Member Invites</p>
                          <p className="text-sm text-gray-400">Allow members to invite others</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTeamSettings({ ...teamSettings, allowMemberInvites: !teamSettings.allowMemberInvites })}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: teamSettings.allowMemberInvites ? currentTheme.colors.primary : '#4b5563' }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${teamSettings.allowMemberInvites ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-status-info" />
                        <div>
                          <p className="font-medium">Require Approval</p>
                          <p className="text-sm text-gray-400">New members need leader approval</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTeamSettings({ ...teamSettings, requireApproval: !teamSettings.requireApproval })}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: teamSettings.requireApproval ? currentTheme.colors.primary : '#4b5563' }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${teamSettings.requireApproval ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Goals & Points Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Goals & Points
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          <div>
                            <p className="font-medium">Weekly Goal</p>
                            <p className="text-sm text-gray-400">Team points target per week</p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-cosmic-purple">{teamSettings.weeklyGoal}</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="2000"
                        step="50"
                        value={teamSettings.weeklyGoal}
                        onChange={(e) => setTeamSettings({ ...teamSettings, weeklyGoal: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>100</span>
                        <span>2000</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Zap className="w-5 h-5 text-cosmic-cyan" />
                          <div>
                            <p className="font-medium">Points Multiplier</p>
                            <p className="text-sm text-gray-400">Bonus multiplier for team tasks</p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-cosmic-cyan">{teamSettings.pointsMultiplier}x</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.25"
                        value={teamSettings.pointsMultiplier}
                        onChange={(e) => setTeamSettings({ ...teamSettings, pointsMultiplier: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1x</span>
                        <span>3x</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notifications Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-status-success" />
                        <div>
                          <p className="font-medium">Task Completion</p>
                          <p className="text-sm text-gray-400">Notify when tasks are completed</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTeamSettings({ ...teamSettings, notifyOnTaskComplete: !teamSettings.notifyOnTaskComplete })}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: teamSettings.notifyOnTaskComplete ? currentTheme.colors.primary : '#4b5563' }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${teamSettings.notifyOnTaskComplete ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-yellow-500" />
                        <div>
                          <p className="font-medium">Achievements</p>
                          <p className="text-sm text-gray-400">Notify on team achievements</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTeamSettings({ ...teamSettings, notifyOnAchievement: !teamSettings.notifyOnAchievement })}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: teamSettings.notifyOnAchievement ? currentTheme.colors.primary : '#4b5563' }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${teamSettings.notifyOnAchievement ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-cosmic-blue" />
                        <div>
                          <p className="font-medium">New Members</p>
                          <p className="text-sm text-gray-400">Notify when members join</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTeamSettings({ ...teamSettings, notifyOnMemberJoin: !teamSettings.notifyOnMemberJoin })}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: teamSettings.notifyOnMemberJoin ? currentTheme.colors.primary : '#4b5563' }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${teamSettings.notifyOnMemberJoin ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Advanced Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Advanced
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        <Shuffle className="w-5 h-5 text-cosmic-purple" />
                        <div>
                          <p className="font-medium">Auto-assign Tasks</p>
                          <p className="text-sm text-gray-400">Automatically distribute tasks to members</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTeamSettings({ ...teamSettings, autoAssignTasks: !teamSettings.autoAssignTasks })}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: teamSettings.autoAssignTasks ? currentTheme.colors.primary : '#4b5563' }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${teamSettings.autoAssignTasks ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        <BarChart2 className="w-5 h-5 text-status-info" />
                        <div>
                          <p className="font-medium">Show Leaderboard</p>
                          <p className="text-sm text-gray-400">Display member rankings</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTeamSettings({ ...teamSettings, showLeaderboard: !teamSettings.showLeaderboard })}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: teamSettings.showLeaderboard ? currentTheme.colors.primary : '#4b5563' }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${teamSettings.showLeaderboard ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-glass-light">
                      <div className="flex items-center gap-3">
                        <Swords className="w-5 h-5 text-status-error" />
                        <div>
                          <p className="font-medium">Team Competitions</p>
                          <p className="text-sm text-gray-400">Allow team vs team challenges</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setTeamSettings({ ...teamSettings, allowCompetitions: !teamSettings.allowCompetitions })}
                        className="w-12 h-6 rounded-full transition-colors"
                        style={{ backgroundColor: teamSettings.allowCompetitions ? currentTheme.colors.primary : '#4b5563' }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${teamSettings.allowCompetitions ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="flex items-center justify-end gap-3 p-6 border-t border-glass-border sticky bottom-0 backdrop-blur-sm"
                style={{ backgroundColor: `${currentTheme.colors.background}f5` }}
              >
                <Button variant="ghost" onClick={() => setShowSettingsModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSettings}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
