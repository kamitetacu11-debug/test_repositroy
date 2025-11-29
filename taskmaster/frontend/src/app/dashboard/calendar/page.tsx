'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  GripVertical,
  Calendar as CalendarIcon,
  LayoutGrid,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: string | null;
  basePoints: number;
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface DayTasks {
  [key: string]: Task[];
}

type ViewMode = 'month' | 'week';

// Demo tasks for when no real data is available
const generateDemoTasks = (): Task[] => {
  const today = new Date();
  const tasks: Task[] = [
    {
      id: 'demo-1',
      title: 'Design dashboard UI',
      description: 'Create wireframes and high-fidelity mockups for the main dashboard',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      basePoints: 40,
      assignee: { id: '1', firstName: 'John', lastName: 'Doe' },
    },
    {
      id: 'demo-2',
      title: 'Implement user authentication',
      description: 'Add JWT-based authentication with refresh tokens',
      status: 'COMPLETED',
      priority: 'HIGH',
      dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      basePoints: 50,
      assignee: { id: '2', firstName: 'Jane', lastName: 'Smith' },
    },
    {
      id: 'demo-3',
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing and deployment',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      basePoints: 30,
      assignee: { id: '2', firstName: 'Jane', lastName: 'Smith' },
    },
    {
      id: 'demo-4',
      title: 'Write API documentation',
      description: 'Document all REST endpoints with OpenAPI/Swagger',
      status: 'TODO',
      priority: 'LOW',
      dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      basePoints: 20,
      assignee: { id: '3', firstName: 'Bob', lastName: 'Johnson' },
    },
    {
      id: 'demo-5',
      title: 'Implement leaderboard feature',
      description: 'Create real-time leaderboard with Redis sorted sets',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      basePoints: 60,
      assignee: null,
    },
    {
      id: 'demo-6',
      title: 'Code review',
      description: 'Review PR #423 for frontend changes',
      status: 'IN_REVIEW',
      priority: 'MEDIUM',
      dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      basePoints: 15,
      assignee: { id: '1', firstName: 'John', lastName: 'Doe' },
    },
    {
      id: 'demo-7',
      title: 'Database optimization',
      description: 'Optimize slow queries and add indexes',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      dueDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      basePoints: 45,
      assignee: { id: '2', firstName: 'Jane', lastName: 'Smith' },
    },
    {
      id: 'demo-8',
      title: 'Mobile app testing',
      description: 'Test all features on iOS and Android devices',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      basePoints: 35,
      assignee: { id: '3', firstName: 'Bob', lastName: 'Johnson' },
    },
  ];
  return tasks;
};

interface TaskFormData {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
}

const initialTaskForm: TaskFormData = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: '',
};

export default function CalendarPage() {
  const { token } = useAuthStore();
  const t = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormData>(initialTaskForm);
  const [submitting, setSubmitting] = useState(false);

  const monthNames = [
    t.calendar.january, t.calendar.february, t.calendar.march, t.calendar.april,
    t.calendar.may, t.calendar.june, t.calendar.july, t.calendar.august,
    t.calendar.september, t.calendar.october, t.calendar.november, t.calendar.december
  ];

  const dayNames = [
    t.calendar.sun, t.calendar.mon, t.calendar.tue, t.calendar.wed,
    t.calendar.thu, t.calendar.fri, t.calendar.sat
  ];

  const fullDayNames = [
    t.leaderboard.sunday, t.leaderboard.monday, t.leaderboard.tuesday, t.leaderboard.wednesday,
    t.leaderboard.thursday, t.leaderboard.friday, t.leaderboard.saturday
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const response = await fetch('/api/v1/tasks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const apiTasks = data.data || [];
        // Use demo data if no tasks returned
        setTasks(apiTasks.length > 0 ? apiTasks : generateDemoTasks());
      } else {
        // Use demo data on error
        setTasks(generateDemoTasks());
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      // Use demo data on error
      setTasks(generateDemoTasks());
    } finally {
      setLoading(false);
    }
  };

  const getTasksByDate = useCallback((): DayTasks => {
    const tasksByDate: DayTasks = {};
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = task.dueDate.split('T')[0];
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
      }
    });
    return tasksByDate;
  }, [tasks]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (number | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push(date);
    }
    return weekDays;
  };

  const formatDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const formatDateKeyFromDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isTodayDate = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPastDate = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return checkDate < today;
  };

  const isPastDateObj = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const handlePrevMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    setDragOverDate(null);

    if (!draggedTask) return;

    // Update local state immediately for better UX
    setTasks(prev => prev.map(t =>
      t.id === draggedTask.id
        ? { ...t, dueDate: `${dateKey}T23:59:59.000Z` }
        : t
    ));

    // Try to update on server (skip for demo tasks)
    if (!draggedTask.id.startsWith('demo-')) {
      try {
        await fetch(`/api/v1/tasks/${draggedTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            dueDate: `${dateKey}T23:59:59.000Z`,
          }),
        });
      } catch (error) {
        console.error('Failed to update task date:', error);
      }
    }

    setDraggedTask(null);
  };

  const handleOpenCreateDialog = (dateKey?: string) => {
    setTaskForm({
      ...initialTaskForm,
      dueDate: dateKey || formatDateKeyFromDate(new Date()),
    });
    setShowCreateDialog(true);
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return;

    setSubmitting(true);

    // For demo, just add to local state
    const newTask: Task = {
      id: `demo-${Date.now()}`,
      title: taskForm.title,
      description: taskForm.description || null,
      status: 'TODO',
      priority: taskForm.priority as Task['priority'],
      dueDate: taskForm.dueDate ? `${taskForm.dueDate}T23:59:59.000Z` : null,
      basePoints: 25,
      assignee: null,
    };

    // Try to create on server
    try {
      const response = await fetch('/api/v1/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || null,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate ? `${taskForm.dueDate}T23:59:59.000Z` : null,
          basePoints: 25,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prev => [...prev, data.data || newTask]);
      } else {
        // Add demo task on error
        setTasks(prev => [...prev, newTask]);
      }
    } catch (error) {
      // Add demo task on error
      setTasks(prev => [...prev, newTask]);
    }

    setSubmitting(false);
    setShowCreateDialog(false);
    setTaskForm(initialTaskForm);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'IN_PROGRESS':
        return <Loader2 className="w-3 h-3 text-blue-500" />;
      case 'IN_REVIEW':
        return <Clock className="w-3 h-3 text-yellow-500" />;
      default:
        return <Circle className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return t.calendar.completed;
      case 'IN_PROGRESS':
        return t.calendar.inProgress;
      case 'IN_REVIEW':
        return t.tasks?.inReview || 'In Review';
      default:
        return t.calendar.todo;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'border-l-red-500 bg-red-500/10';
      case 'HIGH':
        return 'border-l-orange-500 bg-orange-500/10';
      case 'MEDIUM':
        return 'border-l-yellow-500 bg-yellow-500/10';
      default:
        return 'border-l-gray-500 bg-gray-500/10';
    }
  };

  const tasksByDate = getTasksByDate();
  const days = getDaysInMonth();
  const weekDays = getWeekDays();

  // Get all tasks for sidebar (sorted by due date)
  const allTasksWithDates = tasks
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const overdueTasks = allTasksWithDates.filter(t => {
    const dueDate = new Date(t.dueDate!);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && t.status !== 'COMPLETED';
  });

  const upcomingTasks = allTasksWithDates.filter(t => {
    const dueDate = new Date(t.dueDate!);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate >= today && t.status !== 'COMPLETED';
  }).slice(0, 10);

  const getWeekRange = () => {
    const weekDays = getWeekDays();
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]} ${start.getFullYear()}`;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Sidebar - Task List */}
        <div className="lg:w-80 flex-shrink-0 space-y-4">
          <Button
            className="w-full bg-cosmic-purple hover:bg-cosmic-purple/80"
            onClick={() => handleOpenCreateDialog()}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.calendar.addTask}
          </Button>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-500">
                <AlertCircle className="w-4 h-4" />
                {t.calendar.overdue} ({overdueTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {overdueTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {t.calendar.noTasks}
                </p>
              ) : (
                overdueTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => handleTaskClick(task)}
                    className={cn(
                      'p-2 rounded-lg border-l-4 cursor-pointer hover:opacity-80 transition',
                      getPriorityColor(task.priority)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
                      {getStatusIcon(task.status)}
                      <span className="text-sm font-medium truncate flex-1">{task.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 ml-5">
                      {new Date(task.dueDate!).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                {t.calendar.upcoming} ({upcomingTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {t.calendar.noTasks}
                </p>
              ) : (
                upcomingTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => handleTaskClick(task)}
                    className={cn(
                      'p-2 rounded-lg border-l-4 cursor-pointer hover:opacity-80 transition',
                      getPriorityColor(task.priority)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-3 h-3 text-gray-400 cursor-grab" />
                      {getStatusIcon(task.status)}
                      <span className="text-sm font-medium truncate flex-1">{task.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 ml-5">
                      {new Date(task.dueDate!).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">
            {t.calendar.dragToMove}
          </p>
        </div>

        {/* Calendar View */}
        <Card className="glass flex-1">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-cosmic-purple" />
                <CardTitle>{t.calendar.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex border border-glass-border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'rounded-none',
                      viewMode === 'month' && 'bg-cosmic-purple hover:bg-cosmic-purple/80'
                    )}
                    onClick={() => setViewMode('month')}
                  >
                    <LayoutGrid className="w-4 h-4 mr-1" />
                    {t.calendar.month}
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    className={cn(
                      'rounded-none',
                      viewMode === 'week' && 'bg-cosmic-purple hover:bg-cosmic-purple/80'
                    )}
                    onClick={() => setViewMode('week')}
                  >
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {t.calendar.week}
                  </Button>
                </div>

                <Button variant="outline" size="sm" onClick={handleToday}>
                  {t.calendar.today}
                </Button>
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="min-w-[180px] text-center font-medium">
                  {viewMode === 'month'
                    ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                    : getWeekRange()
                  }
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-cosmic-purple" />
              </div>
            ) : viewMode === 'month' ? (
              /* Month View */
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {days.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="p-2 min-h-[100px]" />;
                  }

                  const dateKey = formatDateKey(day);
                  const dayTasks = tasksByDate[dateKey] || [];
                  const isCurrentDay = isToday(day);
                  const isPast = isPastDate(day);
                  const isDropTarget = dragOverDate === dateKey;

                  return (
                    <motion.div
                      key={dateKey}
                      className={cn(
                        'p-1 min-h-[100px] rounded-lg border transition-all group',
                        isCurrentDay ? 'border-cosmic-purple bg-cosmic-purple/10' : 'border-glass-border',
                        isDropTarget && 'border-cosmic-cyan bg-cosmic-cyan/10',
                        isPast && !isCurrentDay && 'opacity-60'
                      )}
                      onDragOver={(e) => handleDragOver(e, dateKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateKey)}
                    >
                      <div className="flex items-center justify-between mb-1 px-1">
                        <span className={cn(
                          'text-sm font-medium',
                          isCurrentDay && 'text-cosmic-purple'
                        )}>
                          {day}
                        </span>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-glass-light rounded"
                          onClick={() => handleOpenCreateDialog(dateKey)}
                        >
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {dayTasks.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={() => handleTaskClick(task)}
                            className={cn(
                              'text-xs p-1 rounded border-l-2 cursor-pointer hover:opacity-80 transition truncate',
                              task.status === 'COMPLETED'
                                ? 'border-l-green-500 bg-green-500/10 line-through opacity-60'
                                : getPriorityColor(task.priority)
                            )}
                          >
                            {task.title}
                          </div>
                        ))}
                        {dayTasks.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              /* Week View */
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {weekDays.map((date, index) => {
                  const isCurrentDay = isTodayDate(date);
                  return (
                    <div
                      key={index}
                      className={cn(
                        'text-center p-2 rounded-lg',
                        isCurrentDay && 'bg-cosmic-purple/20'
                      )}
                    >
                      <div className="text-xs text-muted-foreground">{fullDayNames[index]}</div>
                      <div className={cn(
                        'text-lg font-bold',
                        isCurrentDay && 'text-cosmic-purple'
                      )}>
                        {date.getDate()}
                      </div>
                    </div>
                  );
                })}

                {/* Tasks for each day */}
                {weekDays.map((date, index) => {
                  const dateKey = formatDateKeyFromDate(date);
                  const dayTasks = tasksByDate[dateKey] || [];
                  const isCurrentDay = isTodayDate(date);
                  const isPast = isPastDateObj(date);
                  const isDropTarget = dragOverDate === dateKey;

                  return (
                    <div
                      key={`tasks-${index}`}
                      className={cn(
                        'min-h-[300px] p-2 rounded-lg border transition-all group',
                        isCurrentDay ? 'border-cosmic-purple bg-cosmic-purple/5' : 'border-glass-border',
                        isDropTarget && 'border-cosmic-cyan bg-cosmic-cyan/10',
                        isPast && !isCurrentDay && 'opacity-60'
                      )}
                      onDragOver={(e) => handleDragOver(e, dateKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateKey)}
                    >
                      <button
                        className="w-full mb-2 p-1 border border-dashed border-glass-border rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-glass-light flex items-center justify-center gap-1 text-xs text-muted-foreground"
                        onClick={() => handleOpenCreateDialog(dateKey)}
                      >
                        <Plus className="w-3 h-3" />
                        {t.calendar.addTask}
                      </button>
                      <div className="space-y-2">
                        {dayTasks.map(task => (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={() => handleTaskClick(task)}
                            className={cn(
                              'p-2 rounded-lg border-l-4 cursor-pointer hover:opacity-80 transition',
                              task.status === 'COMPLETED'
                                ? 'border-l-green-500 bg-green-500/10 line-through opacity-60'
                                : getPriorityColor(task.priority)
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <span className="text-sm font-medium truncate">{task.title}</span>
                            </div>
                            {task.assignee && (
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {task.assignee.firstName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Detail Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={t.calendar.taskDetails}
        size="md"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className={cn(
              'p-4 rounded-xl border-l-4',
              getPriorityColor(selectedTask.priority)
            )}>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(selectedTask.status)}
                <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
              </div>
              {selectedTask.description && (
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t.calendar.status}</p>
                <Badge variant="outline" className="mt-1">
                  {getStatusLabel(selectedTask.status)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.calendar.priority}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    'mt-1',
                    selectedTask.priority === 'CRITICAL' && 'text-red-500 border-red-500',
                    selectedTask.priority === 'HIGH' && 'text-orange-500 border-orange-500',
                    selectedTask.priority === 'MEDIUM' && 'text-yellow-500 border-yellow-500',
                    selectedTask.priority === 'LOW' && 'text-gray-500 border-gray-500',
                  )}
                >
                  {selectedTask.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.calendar.dueDate}</p>
                <p className="font-medium mt-1">
                  {selectedTask.dueDate
                    ? new Date(selectedTask.dueDate).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.calendar.assignee}</p>
                <p className="font-medium mt-1 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {selectedTask.assignee
                    ? `${selectedTask.assignee.firstName} ${selectedTask.assignee.lastName}`
                    : '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-glass-border">
              <span className="text-cosmic-purple font-medium">
                +{selectedTask.basePoints} pts
              </span>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowTaskModal(false)}>
            {t.ai.close}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.calendar.addTask}</DialogTitle>
            <DialogDescription>
              {t.tasks?.createTaskDescription || 'Create a new task'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.tasks?.title || 'Title'} *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder={t.tasks?.titlePlaceholder || 'Enter task title'}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.tasks?.description || 'Description'}</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder={t.tasks?.descriptionPlaceholder || 'Enter task description'}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.calendar.priority}</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.calendar.dueDate}</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t.ai.cancel}
            </Button>
            <Button onClick={handleCreateTask} disabled={submitting || !taskForm.title.trim()}>
              {submitting ? t.crm?.saving || 'Saving...' : t.crm?.create || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
