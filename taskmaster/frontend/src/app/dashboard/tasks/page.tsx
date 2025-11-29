'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreVertical,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { getPriorityColor, getStatusColor } from '@/lib/utils';

const mockTasks = [
  { id: '1', title: 'Design dashboard UI', description: 'Create wireframes and mockups', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-12-02', points: 40, assignee: 'John Doe' },
  { id: '2', title: 'Implement API endpoints', description: 'REST API for tasks module', status: 'TODO', priority: 'CRITICAL', dueDate: '2024-12-01', points: 50, assignee: 'Jane Smith' },
  { id: '3', title: 'Write unit tests', description: 'Coverage for auth module', status: 'TODO', priority: 'MEDIUM', dueDate: '2024-12-03', points: 30, assignee: 'Bob Johnson' },
  { id: '4', title: 'Review pull requests', description: 'Review pending PRs', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-12-01', points: 20, assignee: 'John Doe' },
  { id: '5', title: 'Setup CI/CD pipeline', description: 'GitHub Actions workflow', status: 'COMPLETED', priority: 'HIGH', dueDate: '2024-11-28', points: 60, assignee: 'Jane Smith' },
  { id: '6', title: 'Database optimization', description: 'Optimize slow queries', status: 'TODO', priority: 'LOW', dueDate: '2024-12-10', points: 35, assignee: 'Bob Johnson' },
];

const statusOptions = ['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED'];
const priorityOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TasksPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-5 h-5 text-status-success" />;
      case 'IN_PROGRESS': return <Clock className="w-5 h-5 text-cosmic-blue" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
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
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-gray-400 mt-1">Manage and track your tasks</p>
          </div>
          <Button className="bg-cosmic-purple hover:bg-cosmic-purple/80">
            <Plus className="mr-2 w-4 h-4" />
            New Task
          </Button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-xl bg-glass-light border border-glass-border text-white"
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt} className="bg-cosmic-dark">{opt}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 rounded-xl bg-glass-light border border-glass-border text-white"
            >
              {priorityOptions.map(opt => (
                <option key={opt} value={opt} className="bg-cosmic-dark">{opt}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total', value: mockTasks.length, color: 'text-white' },
            { label: 'To Do', value: mockTasks.filter(t => t.status === 'TODO').length, color: 'text-gray-400' },
            { label: 'In Progress', value: mockTasks.filter(t => t.status === 'IN_PROGRESS').length, color: 'text-cosmic-blue' },
            { label: 'Completed', value: mockTasks.filter(t => t.status === 'COMPLETED').length, color: 'text-status-success' },
          ].map((stat, i) => (
            <Card key={i} className="glass">
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Task List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass">
            <CardContent className="p-0">
              <div className="divide-y divide-glass-border">
                {filteredTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex items-center gap-4 p-4 hover:bg-glass-light transition cursor-pointer"
                  >
                    {getStatusIcon(task.status)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{task.title}</h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: `${getPriorityColor(task.priority)}20`, color: getPriorityColor(task.priority) }}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">{task.description}</p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {task.dueDate}
                      </div>
                      <div className="w-24 truncate">{task.assignee}</div>
                      <div className="text-cosmic-purple font-medium">+{task.points} pts</div>
                    </div>

                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
