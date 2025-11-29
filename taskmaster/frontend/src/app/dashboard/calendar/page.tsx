'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const monthNames = [
    t.calendar.january, t.calendar.february, t.calendar.march, t.calendar.april,
    t.calendar.may, t.calendar.june, t.calendar.july, t.calendar.august,
    t.calendar.september, t.calendar.october, t.calendar.november, t.calendar.december
  ];

  const dayNames = [
    t.calendar.sun, t.calendar.mon, t.calendar.tue, t.calendar.wed,
    t.calendar.thu, t.calendar.fri, t.calendar.sat
  ];

  useEffect(() => {
    fetchTasks();
  }, [currentDate]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const response = await fetch('/api/v1/tasks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
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

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const formatDateKey = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isPastDate = (day: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return checkDate < today;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
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

    try {
      const response = await fetch(`/api/v1/tasks/${draggedTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dueDate: `${dateKey}T23:59:59.000Z`,
        }),
      });

      if (response.ok) {
        // Update local state
        setTasks(prev => prev.map(t =>
          t.id === draggedTask.id
            ? { ...t, dueDate: `${dateKey}T23:59:59.000Z` }
            : t
        ));
      }
    } catch (error) {
      console.error('Failed to update task date:', error);
    }

    setDraggedTask(null);
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
        return t.tasks.inReview;
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

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* Sidebar - Task List */}
        <div className="lg:w-80 flex-shrink-0 space-y-4">
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-cosmic-purple" />
                <CardTitle>{t.calendar.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleToday}>
                  {t.calendar.today}
                </Button>
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="min-w-[140px] text-center font-medium">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
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
            ) : (
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
                        'p-1 min-h-[100px] rounded-lg border transition-all',
                        isCurrentDay ? 'border-cosmic-purple bg-cosmic-purple/10' : 'border-glass-border',
                        isDropTarget && 'border-cosmic-cyan bg-cosmic-cyan/10',
                        isPast && !isCurrentDay && 'opacity-60'
                      )}
                      onDragOver={(e) => handleDragOver(e, dateKey)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateKey)}
                    >
                      <div className={cn(
                        'text-sm font-medium mb-1 px-1',
                        isCurrentDay && 'text-cosmic-purple'
                      )}>
                        {day}
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
    </DashboardLayout>
  );
}
