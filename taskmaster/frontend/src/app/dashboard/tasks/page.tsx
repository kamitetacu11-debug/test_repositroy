'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreVertical,
  Calendar,
  Eye,
  Edit3,
  Copy,
  UserPlus,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { TaskModal, Task } from '@/components/tasks/task-modal';
import { CreateTaskModal } from '@/components/tasks/create-task-modal';
import { useToast } from '@/components/ui/toast';
import { getPriorityColor, getStatusColor } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

const initialTasks: Task[] = [
  { id: '1', title: 'Design dashboard UI', description: 'Create wireframes and mockups for the new dashboard interface. Include responsive design considerations and dark mode support.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-12-02', points: 40, assignee: 'John Doe', assigneeId: 'USR-001' },
  { id: '2', title: 'Implement API endpoints', description: 'Build REST API endpoints for the tasks module including CRUD operations, filtering, and pagination.', status: 'TODO', priority: 'CRITICAL', dueDate: '2024-12-01', points: 50, assignee: 'Jane Smith', assigneeId: 'USR-002' },
  { id: '3', title: 'Write unit tests', description: 'Achieve 80% test coverage for the authentication module. Include edge cases and error handling tests.', status: 'TODO', priority: 'MEDIUM', dueDate: '2024-12-03', points: 30, assignee: 'Bob Johnson', assigneeId: 'USR-003' },
  { id: '4', title: 'Review pull requests', description: 'Review and provide feedback on pending pull requests from the team.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2024-12-01', points: 20, assignee: 'John Doe', assigneeId: 'USR-001' },
  { id: '5', title: 'Setup CI/CD pipeline', description: 'Configure GitHub Actions workflow for automated testing and deployment.', status: 'COMPLETED', priority: 'HIGH', dueDate: '2024-11-28', points: 60, assignee: 'Jane Smith', assigneeId: 'USR-002' },
  { id: '6', title: 'Database optimization', description: 'Analyze and optimize slow database queries. Add proper indexing and query caching.', status: 'TODO', priority: 'LOW', dueDate: '2024-12-10', points: 35, assignee: 'Bob Johnson', assigneeId: 'USR-003' },
];

const statusOptions = ['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'];
const priorityOptions = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { addToast } = useToast();
  const t = useTranslation();

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
                          task.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="w-5 h-5 text-status-success" />;
      case 'IN_PROGRESS': return <Clock className="w-5 h-5 text-cosmic-blue" />;
      case 'IN_REVIEW': return <AlertCircle className="w-5 h-5 text-status-warning" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

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

    const statusMessages: Record<Task['status'], string> = {
      'TODO': 'moved to To Do',
      'IN_PROGRESS': 'started',
      'IN_REVIEW': 'submitted for review',
      'COMPLETED': 'marked as complete',
    };

    addToast({
      type: newStatus === 'COMPLETED' ? 'success' : 'info',
      title: 'Status Updated',
      message: `Task ${statusMessages[newStatus]}.`,
    });
  };

  const handleDuplicateTask = (task: Task) => {
    const duplicatedTask: Task = {
      ...task,
      id: Date.now().toString(),
      title: `${task.title} (Copy)`,
      status: 'TODO',
    };
    setTasks([duplicatedTask, ...tasks]);
    addToast({
      type: 'success',
      title: 'Task Duplicated',
      message: `"${task.title}" has been duplicated.`,
    });
  };

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'TODO').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
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
            <h1 className="text-3xl font-bold">{t.tasks.title}</h1>
            <p className="text-gray-400 mt-1">{t.tasks.subtitle}</p>
          </div>
          <Button
            className="bg-cosmic-purple hover:bg-cosmic-purple/80"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="mr-2 w-4 h-4" />
            {t.tasks.newTask}
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
              placeholder={t.tasks.searchTasks}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-xl bg-glass-light border border-glass-border text-white cursor-pointer"
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt} className="bg-cosmic-dark">{opt.replace('_', ' ')}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 rounded-xl bg-glass-light border border-glass-border text-white cursor-pointer"
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
            { label: t.tasks.total, value: taskStats.total, color: 'text-white' },
            { label: t.tasks.toDo, value: taskStats.todo, color: 'text-gray-400' },
            { label: t.tasks.inProgress, value: taskStats.inProgress, color: 'text-cosmic-blue' },
            { label: t.tasks.completed, value: taskStats.completed, color: 'text-status-success' },
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
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-glass-light flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400">{t.tasks.noTasks}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t.tasks.tryAdjusting}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                  {filteredTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{
                        opacity: 0,
                        x: -100,
                        scale: 0.8,
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        transition: { duration: 0.3 }
                      }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className="flex items-center gap-4 p-4 hover:bg-glass-light transition cursor-pointer group"
                      onClick={() => handleTaskClick(task)}
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

                      {/* Context Menu */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Dropdown
                          trigger={
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          }
                        >
                          <DropdownItem
                            icon={<Eye className="w-4 h-4" />}
                            onClick={() => handleTaskClick(task)}
                          >
                            {t.tasks.viewDetails}
                          </DropdownItem>
                          <DropdownItem
                            icon={<Edit3 className="w-4 h-4" />}
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskModalOpen(true);
                            }}
                          >
                            {t.tasks.editTask}
                          </DropdownItem>
                          <DropdownItem
                            icon={<Copy className="w-4 h-4" />}
                            onClick={() => handleDuplicateTask(task)}
                          >
                            {t.tasks.duplicate}
                          </DropdownItem>
                          <DropdownItem
                            icon={<UserPlus className="w-4 h-4" />}
                            onClick={() => {
                              setSelectedTask(task);
                              setIsTaskModalOpen(true);
                            }}
                          >
                            {t.tasks.reassign}
                          </DropdownItem>

                          <DropdownDivider />

                          {task.status !== 'COMPLETED' && (
                            <DropdownItem
                              icon={<CheckCircle2 className="w-4 h-4" />}
                              onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                            >
                              {t.tasks.markComplete}
                            </DropdownItem>
                          )}

                          {task.status === 'TODO' && (
                            <DropdownItem
                              icon={<ArrowRight className="w-4 h-4" />}
                              onClick={() => handleStatusChange(task.id, 'IN_PROGRESS')}
                            >
                              {t.tasks.startWorking}
                            </DropdownItem>
                          )}

                          <DropdownDivider />

                          <DropdownItem
                            icon={<Trash2 className="w-4 h-4" />}
                            variant="danger"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            {t.tasks.delete}
                          </DropdownItem>
                        </Dropdown>
                      </div>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
