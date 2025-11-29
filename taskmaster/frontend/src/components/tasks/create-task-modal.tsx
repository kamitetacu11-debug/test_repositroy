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

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: Omit<Task, 'id'>) => void;
}

const statusOptions = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

// Mock users for assignee selection
const mockUsers = [
  { id: 'USR-001', name: 'John Doe', team: 'Frontend Team' },
  { id: 'USR-002', name: 'Jane Smith', team: 'Backend Team' },
  { id: 'USR-003', name: 'Bob Johnson', team: 'Mobile Team' },
  { id: 'USR-004', name: 'Sarah Connor', team: 'Frontend Team' },
  { id: 'USR-005', name: 'Mike Wilson', team: 'DevOps Team' },
];

const defaultTask = {
  title: '',
  description: '',
  status: 'TODO' as const,
  priority: 'MEDIUM' as const,
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
  const [task, setTask] = useState(defaultTask);
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
      newErrors.title = 'Title is required';
    }
    if (!task.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    if (!task.assignee) {
      newErrors.assignee = 'Assignee is required';
    }
    if (task.points < 0) {
      newErrors.points = 'Points must be positive';
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Task"
      description="Fill in the details to create a new task"
      size="lg"
    >
      <div className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Tag className="w-4 h-4" /> Title *
          </label>
          <Input
            value={task.title}
            onChange={(e) => {
              setTask({ ...task, title: e.target.value });
              if (errors.title) setErrors({ ...errors, title: '' });
            }}
            placeholder="Enter task title..."
            className={errors.title ? 'border-status-error' : ''}
          />
          {errors.title && (
            <p className="text-sm text-status-error">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400 flex items-center gap-2">
            <Tag className="w-4 h-4" /> Description
          </label>
          <Textarea
            value={task.description}
            onChange={(e) => setTask({ ...task, description: e.target.value })}
            placeholder="Describe the task in detail..."
          />
        </div>

        {/* Status & Priority Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Status
            </label>
            <Select
              value={task.status}
              onChange={(e) =>
                setTask({ ...task, status: e.target.value as Task['status'] })
              }
              options={statusOptions}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Priority
            </label>
            <Select
              value={task.priority}
              onChange={(e) =>
                setTask({ ...task, priority: e.target.value as Task['priority'] })
              }
              options={priorityOptions}
            />
          </div>
        </div>

        {/* Due Date & Points Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Due Date *
            </label>
            <DatePicker
              value={task.dueDate}
              onChange={(value) => {
                setTask({ ...task, dueDate: value });
                if (errors.dueDate) setErrors({ ...errors, dueDate: '' });
              }}
              placeholder="Select date..."
              error={!!errors.dueDate}
              locale="en"
            />
            {errors.dueDate && (
              <p className="text-sm text-status-error">{errors.dueDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Points Reward
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
            <User className="w-4 h-4" /> Assign To *
          </label>

          {/* Selected Assignee */}
          {task.assignee ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-glass-light border border-glass-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cosmic-purple/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-cosmic-purple">
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
                Change
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
                  placeholder="Search by ID or name..."
                  className={`pl-10 ${errors.assignee ? 'border-status-error' : ''}`}
                />
              </div>

              {/* Dropdown */}
              {showAssigneeDropdown && (
                <div className="absolute z-10 mt-2 w-full rounded-xl bg-cosmic-dark border border-glass-border shadow-xl max-h-48 overflow-y-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => selectAssignee(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-glass-light transition text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-cosmic-purple/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-cosmic-purple">
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
                      No users found
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
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </ModalFooter>
    </Modal>
  );
}
