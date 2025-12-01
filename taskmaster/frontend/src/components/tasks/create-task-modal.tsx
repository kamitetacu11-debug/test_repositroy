'use client';

import { useState } from 'react';
import {
  Calendar,
  User,
  Tag,
  Zap,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Task } from './task-modal';
import { useSettingsStore } from '@/stores/settings.store';
import { useTranslation } from '@/hooks/useTranslation';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Omit<Task, 'id'>) => void;
}


// Mock users for assignee selection
const mockUsers = [
  { id: 'USR-001', name: 'John Doe', team: 'Frontend Team' },
  { id: 'USR-002', name: 'Jane Smith', team: 'Backend Team' },
  { id: 'USR-003', name: 'Bob Johnson', team: 'Mobile Team' },
  { id: 'USR-004', name: 'Sarah Connor', team: 'Frontend Team' },
  { id: 'USR-005', name: 'Mike Wilson', team: 'DevOps Team' },
];

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface NewTask {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  points: number;
  assignee: string;
  assigneeId: string;
}

const defaultTask: NewTask = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
  points: 20,
  assignee: '',
  assigneeId: '',
};

export function CreateTaskModal({
  isOpen,
  onClose,
  onCreate,
}: CreateTaskModalProps) {
  const { getCurrentTheme, language } = useSettingsStore();
  const currentTheme = getCurrentTheme();
  const t = useTranslation();
  const [task, setTask] = useState<NewTask>(defaultTask);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
      user.id.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!task.title.trim()) {
      newErrors.title = t.tasks.titleRequired;
    }
    if (!task.dueDate) {
      newErrors.dueDate = t.tasks.dueDateRequired;
    }
    if (!task.assignee) {
      newErrors.assignee = t.tasks.assigneeRequired;
    }
    if (task.points < 0) {
      newErrors.points = t.tasks.pointsMustBePositive;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onCreate(task);
      setTask(defaultTask);
      setErrors({});
      onClose();
    }
  };

  const handleClose = () => {
    setTask(defaultTask);
    setErrors({});
    setAssigneeSearch('');
    onClose();
  };

  const selectAssignee = (user: (typeof mockUsers)[0]) => {
    setTask({ ...task, assignee: user.name, assigneeId: user.id });
    setAssigneeSearch('');
    setShowAssigneeDropdown(false);
    setErrors({ ...errors, assignee: '' });
  };

  const statusOptions = [
    { value: 'TODO', label: t.tasks.toDo },
    { value: 'IN_PROGRESS', label: t.tasks.inProgress },
  ];

  const priorityOptions = [
    { value: 'LOW', label: t.tasks.low },
    { value: 'MEDIUM', label: t.tasks.medium },
    { value: 'HIGH', label: t.tasks.high },
    { value: 'CRITICAL', label: t.tasks.critical },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t.tasks.createNewTask}
      description={t.tasks.fillDetails}
      size="lg"
    >
      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Tag className="w-4 h-4" /> {t.tasks.titleLabel} *
          </label>
          <Input
            value={task.title}
            onChange={(e) => {
              setTask({ ...task, title: e.target.value });
              if (errors.title) setErrors({ ...errors, title: '' });
            }}
            placeholder={t.tasks.enterTaskTitle}
            className={errors.title ? 'border-status-error' : ''}
          />
          {errors.title && (
            <p className="text-sm text-status-error">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Tag className="w-4 h-4" /> {t.tasks.description}
          </label>
          <Textarea
            value={task.description}
            onChange={(e) => setTask({ ...task, description: e.target.value })}
            placeholder={t.tasks.describeTask}
          />
        </div>

        {/* Status & Priority Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {t.tasks.status}
            </label>
            <Select
              value={task.status}
              onChange={(e) =>
                setTask({ ...task, status: e.target.value as TaskStatus })
              }
              options={statusOptions}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {t.tasks.priority}
            </label>
            <Select
              value={task.priority}
              onChange={(e) =>
                setTask({ ...task, priority: e.target.value as TaskPriority })
              }
              options={priorityOptions}
            />
          </div>
        </div>

        {/* Due Date & Points Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {t.tasks.dueDate} *
            </label>
            <DatePicker
              value={task.dueDate}
              onChange={(value) => {
                setTask({ ...task, dueDate: value });
                if (errors.dueDate) setErrors({ ...errors, dueDate: '' });
              }}
              placeholder={t.tasks.selectDate}
              error={!!errors.dueDate}
              locale={language}
            />
            {errors.dueDate && (
              <p className="text-sm text-status-error">{errors.dueDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Zap className="w-4 h-4" /> {t.tasks.pointsReward}
            </label>
            <Input
              type="number"
              value={task.points}
              onChange={(e) => {
                setTask({ ...task, points: parseInt(e.target.value) || 0 });
                if (errors.points) setErrors({ ...errors, points: '' });
              }}
              min={0}
              max={100}
              className={errors.points ? 'border-status-error' : ''}
            />
            {errors.points && (
              <p className="text-sm text-status-error">{errors.points}</p>
            )}
          </div>
        </div>

        {/* Assignee */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <User className="w-4 h-4" /> {t.tasks.assignTo} *
          </label>

          {/* Selected Assignee */}
          {task.assignee ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-glass-light border border-glass-border">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${currentTheme.colors.primary}20` }}
                >
                  <span className="text-sm font-medium" style={{ color: currentTheme.colors.primary }}>
                    {task.assignee
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{task.assignee}</p>
                  <p className="text-xs text-gray-400">ID: #{task.assigneeId}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTask({ ...task, assignee: '', assigneeId: '' });
                  setShowAssigneeDropdown(true);
                }}
              >
                {t.tasks.change}
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={assigneeSearch}
                  onChange={(e) => {
                    setAssigneeSearch(e.target.value);
                    setShowAssigneeDropdown(true);
                  }}
                  onFocus={() => setShowAssigneeDropdown(true)}
                  placeholder={t.tasks.searchByIdOrName}
                  className={`pl-10 ${errors.assignee ? 'border-status-error' : ''}`}
                />
              </div>

              {/* Dropdown */}
              {showAssigneeDropdown && (
                <div
                  className="absolute z-10 mt-2 w-full rounded-xl border border-glass-border shadow-xl max-h-48 overflow-y-auto"
                  style={{ backgroundColor: currentTheme.colors.background }}
                >
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => selectAssignee(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-glass-light transition text-left"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${currentTheme.colors.primary}20` }}
                        >
                          <span className="text-xs font-medium" style={{ color: currentTheme.colors.primary }}>
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            #{user.id} · {user.team}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      {t.tasks.noUsersFound}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {errors.assignee && (
            <p className="text-sm text-status-error">{errors.assignee}</p>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          {t.common.cancel}
        </Button>
        <Button onClick={handleSubmit}>
          <Plus className="w-4 h-4 mr-2" />
          {t.tasks.createTask}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
