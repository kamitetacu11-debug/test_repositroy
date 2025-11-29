'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  User,
  Tag,
  MessageSquare,
  Send,
  Trash2,
  Edit3,
  CheckCircle2,
  Circle,
  AlertCircle,
  Zap,
  Save,
  X,
} from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { getPriorityColor, getStatusColor } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settings.store';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: string;
  points: number;
  assignee: string;
  assigneeId?: string;
  createdAt?: string;
  estimatedHours?: number;
  comments?: Comment[];
}

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSave?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: Task['status']) => void;
}


// Mock comments
const mockComments: Comment[] = [
  { id: '1', author: 'Jane Smith', content: 'Great progress on this task!', createdAt: '2 hours ago' },
  { id: '2', author: 'Bob Johnson', content: 'Need to review the edge cases.', createdAt: '1 day ago' },
];

export function TaskModal({
  isOpen,
  onClose,
  task,
  onSave,
  onDelete,
  onStatusChange,
}: TaskModalProps) {
  const t = useTranslation();
  const { language } = useSettingsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusOptions = [
    { value: 'TODO', label: t.tasks.toDo },
    { value: 'IN_PROGRESS', label: t.tasks.inProgress },
    { value: 'IN_REVIEW', label: t.tasks.inReview },
    { value: 'COMPLETED', label: t.tasks.completed },
  ];

  const priorityOptions = [
    { value: 'LOW', label: t.tasks.low },
    { value: 'MEDIUM', label: t.tasks.medium },
    { value: 'HIGH', label: t.tasks.high },
    { value: 'CRITICAL', label: t.tasks.critical },
  ];

  // Initialize edited task when task changes
  useState(() => {
    if (task) {
      setEditedTask({ ...task });
    }
  });

  if (!task) return null;

  const currentTask = isEditing && editedTask ? editedTask : task;

  const handleSave = () => {
    if (editedTask && onSave) {
      onSave(editedTask);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleStatusChange = (newStatus: Task['status']) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        author: 'You',
        content: newComment,
        createdAt: 'Just now',
      };
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-status-success" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-cosmic-blue" />;
      case 'IN_REVIEW':
        return <AlertCircle className="w-5 h-5 text-status-warning" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      default:
        return 'gray';
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? t.tasks.editTask : t.tasks.taskDetails}
        size="lg"
      >
        <div className="space-y-6">
          {/* Title & Priority */}
          <div className="space-y-2">
            {isEditing ? (
              <Input
                value={editedTask?.title || ''}
                onChange={(e) =>
                  setEditedTask((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
                placeholder="Task title"
                className="text-lg font-semibold"
              />
            ) : (
              <div className="flex items-center gap-3">
                {getStatusIcon(currentTask.status)}
                <h3 className="text-xl font-semibold text-white">
                  {currentTask.title}
                </h3>
                <Badge variant={getPriorityBadgeVariant(currentTask.priority) as 'error' | 'warning' | 'info' | 'gray'}>
                  {currentTask.priority}
                </Badge>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Tag className="w-4 h-4" /> {t.tasks.description}
            </label>
            {isEditing ? (
              <Textarea
                value={editedTask?.description || ''}
                onChange={(e) =>
                  setEditedTask((prev) =>
                    prev ? { ...prev, description: e.target.value } : null
                  )
                }
                placeholder={t.tasks.describeTask}
              />
            ) : (
              <p className="text-gray-300 bg-glass-light rounded-xl p-4">
                {currentTask.description || t.tasks.noDescription}
              </p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {t.tasks.status}
              </label>
              {isEditing ? (
                <Select
                  value={editedTask?.status || 'TODO'}
                  onChange={(e) =>
                    setEditedTask((prev) =>
                      prev
                        ? { ...prev, status: e.target.value as Task['status'] }
                        : null
                    )
                  }
                  options={statusOptions}
                />
              ) : (
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                  style={{
                    backgroundColor: `${getStatusColor(currentTask.status)}15`,
                  }}
                >
                  {getStatusIcon(currentTask.status)}
                  <span style={{ color: getStatusColor(currentTask.status) }}>
                    {statusOptions.find((s) => s.value === currentTask.status)
                      ?.label || currentTask.status}
                  </span>
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {t.tasks.priority}
              </label>
              {isEditing ? (
                <Select
                  value={editedTask?.priority || 'MEDIUM'}
                  onChange={(e) =>
                    setEditedTask((prev) =>
                      prev
                        ? { ...prev, priority: e.target.value as Task['priority'] }
                        : null
                    )
                  }
                  options={priorityOptions}
                />
              ) : (
                <div
                  className="px-4 py-2.5 rounded-xl"
                  style={{
                    backgroundColor: `${getPriorityColor(currentTask.priority)}15`,
                    color: getPriorityColor(currentTask.priority),
                  }}
                >
                  {currentTask.priority}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {t.tasks.dueDate}
              </label>
              {isEditing ? (
                <DatePicker
                  value={editedTask?.dueDate || ''}
                  onChange={(value) =>
                    setEditedTask((prev) =>
                      prev ? { ...prev, dueDate: value } : null
                    )
                  }
                  placeholder={t.tasks.selectDate}
                  locale={language}
                />
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-glass-light">
                  <Calendar className="w-4 h-4 text-cosmic-purple" />
                  <span>{currentTask.dueDate}</span>
                </div>
              )}
            </div>

            {/* Points */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> {t.tasks.pointsReward}
              </label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedTask?.points || 0}
                  onChange={(e) =>
                    setEditedTask((prev) =>
                      prev ? { ...prev, points: parseInt(e.target.value) || 0 } : null
                    )
                  }
                  min={0}
                />
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cosmic-purple/10">
                  <Zap className="w-4 h-4 text-cosmic-purple" />
                  <span className="text-cosmic-purple font-medium">
                    +{currentTask.points} pts
                  </span>
                </div>
              )}
            </div>

            {/* Assignee */}
            <div className="space-y-2 col-span-2">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <User className="w-4 h-4" /> {t.tasks.assignee}
              </label>
              {isEditing ? (
                <Input
                  value={editedTask?.assignee || ''}
                  onChange={(e) =>
                    setEditedTask((prev) =>
                      prev ? { ...prev, assignee: e.target.value } : null
                    )
                  }
                  placeholder="Assignee name"
                />
              ) : (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-glass-light">
                  <div className="w-8 h-8 rounded-full bg-cosmic-purple/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-cosmic-purple">
                      {currentTask.assignee
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{currentTask.assignee}</p>
                    {currentTask.assigneeId && (
                      <p className="text-xs text-gray-400">
                        ID: #{currentTask.assigneeId}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          {!isEditing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> {t.tasks.comments} ({comments.length})
                </label>
              </div>

              {/* Add Comment */}
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t.tasks.addComment}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <Button onClick={handleAddComment} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-48 overflow-y-auto">
                <AnimatePresence>
                  {comments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-3 rounded-xl bg-glass-light"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-gray-500">
                          {comment.createdAt}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{comment.content}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Quick Status Change Buttons (when not editing) */}
          {!isEditing && currentTask.status !== 'COMPLETED' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-glass-border">
              <span className="text-sm text-gray-400 w-full mb-2">{t.tasks.quickActions}</span>
              {currentTask.status === 'TODO' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {t.tasks.startWorking}
                </Button>
              )}
              {currentTask.status === 'IN_PROGRESS' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('IN_REVIEW')}
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {t.tasks.submitForReview}
                </Button>
              )}
              {(currentTask.status === 'IN_PROGRESS' ||
                currentTask.status === 'IN_REVIEW') && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleStatusChange('COMPLETED')}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t.tasks.markComplete}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <ModalFooter>
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                {t.common.cancel}
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                {t.tasks.saveChanges}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="text-status-error hover:bg-status-error/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t.tasks.delete}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditedTask({ ...task });
                  setIsEditing(true);
                }}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {t.tasks.edit}
              </Button>
              <Button onClick={onClose}>{t.tasks.close}</Button>
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t.tasks.deleteTask}
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-status-error/20 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-status-error" />
          </div>
          <p className="text-gray-300 mb-2">
            {t.tasks.confirmDelete}
          </p>
          <p className="text-sm text-gray-500">
            &quot;{task.title}&quot;
          </p>
        </div>
        <ModalFooter className="justify-center">
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
            {t.common.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t.tasks.deleteTask}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
