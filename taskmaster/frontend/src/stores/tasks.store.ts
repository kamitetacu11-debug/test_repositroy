import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Task interface - shared between Tasks page and Calendar
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: string | null;
  basePoints: number;
  bonusPoints?: number;
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  assigneeId?: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  creatorId?: string;
  estimatedHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

// For backward compatibility with task-modal.tsx
export interface LegacyTask {
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
}

// Convert between formats
export const toLegacyTask = (task: Task): LegacyTask => ({
  id: task.id,
  title: task.title,
  description: task.description || '',
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate || '',
  points: task.basePoints + (task.bonusPoints || 0),
  assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : '',
  assigneeId: task.assignee?.id || task.assigneeId,
  createdAt: task.createdAt,
  estimatedHours: task.estimatedHours,
});

export const fromLegacyTask = (task: LegacyTask): Partial<Task> => ({
  id: task.id,
  title: task.title,
  description: task.description,
  status: task.status,
  priority: task.priority,
  dueDate: task.dueDate || null,
  basePoints: task.points,
  assigneeId: task.assigneeId,
  estimatedHours: task.estimatedHours,
});

// Demo tasks for fallback
const generateDemoTasks = (): Task[] => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return [
    {
      id: 'demo-task-1',
      title: 'Design dashboard UI',
      description: 'Create wireframes and mockups for the new dashboard interface. Include responsive design considerations and dark mode support.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: tomorrow.toISOString(),
      basePoints: 40,
      assignee: { id: 'USR-001', firstName: 'John', lastName: 'Doe' },
    },
    {
      id: 'demo-task-2',
      title: 'Implement API endpoints',
      description: 'Build REST API endpoints for the tasks module including CRUD operations, filtering, and pagination.',
      status: 'TODO',
      priority: 'CRITICAL',
      dueDate: today.toISOString(),
      basePoints: 50,
      assignee: { id: 'USR-002', firstName: 'Jane', lastName: 'Smith' },
    },
    {
      id: 'demo-task-3',
      title: 'Write unit tests',
      description: 'Achieve 80% test coverage for the authentication module. Include edge cases and error handling tests.',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: nextWeek.toISOString(),
      basePoints: 30,
      assignee: { id: 'USR-003', firstName: 'Bob', lastName: 'Johnson' },
    },
    {
      id: 'demo-task-4',
      title: 'Review pull requests',
      description: 'Review and provide feedback on pending pull requests from the team.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: today.toISOString(),
      basePoints: 20,
      assignee: { id: 'USR-001', firstName: 'John', lastName: 'Doe' },
    },
    {
      id: 'demo-task-5',
      title: 'Setup CI/CD pipeline',
      description: 'Configure GitHub Actions workflow for automated testing and deployment.',
      status: 'COMPLETED',
      priority: 'HIGH',
      dueDate: yesterday.toISOString(),
      basePoints: 60,
      assignee: { id: 'USR-002', firstName: 'Jane', lastName: 'Smith' },
    },
    {
      id: 'demo-task-6',
      title: 'Database optimization',
      description: 'Analyze and optimize slow database queries. Add proper indexing and query caching.',
      status: 'TODO',
      priority: 'LOW',
      dueDate: nextWeek.toISOString(),
      basePoints: 35,
      assignee: { id: 'USR-003', firstName: 'Bob', lastName: 'Johnson' },
    },
  ];
};

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  isHydrated: boolean;
  lastFetched: number | null;

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;

  // API methods
  fetchTasks: (token: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id'>, token: string) => Promise<Task | null>;
  updateTaskApi: (id: string, updates: Partial<Task>, token: string) => Promise<boolean>;
  deleteTaskApi: (id: string, token: string) => Promise<boolean>;

  // Helpers
  getTasksByDate: () => Record<string, Task[]>;
  getTaskById: (id: string) => Task | undefined;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      isLoading: false,
      isHydrated: false,
      lastFetched: null,

      setTasks: (tasks) => set({ tasks, lastFetched: Date.now() }),

      addTask: (task) => set((state) => ({
        tasks: [task, ...state.tasks],
        lastFetched: Date.now(), // Update timestamp on add
      })),

      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        ),
        lastFetched: Date.now(), // Update timestamp on update
      })),

      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        lastFetched: Date.now(), // Update timestamp on delete
      })),

      setLoading: (loading) => set({ isLoading: loading }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      // Fetch tasks from API - only if no local data or data is stale
      fetchTasks: async (token) => {
        const { setLoading, setTasks, setHydrated, tasks, lastFetched } = get();

        // If we have local tasks and they're recent (within 5 minutes), don't refetch
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        if (tasks.length > 0 && lastFetched && (Date.now() - lastFetched) < CACHE_DURATION) {
          setHydrated(true);
          return;
        }

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
            // Only use demo data if API returned nothing AND we have no local tasks
            if (apiTasks.length > 0) {
              setTasks(apiTasks);
            } else if (tasks.length === 0) {
              setTasks(generateDemoTasks());
            }
            // If we have local tasks but API returned nothing, keep local tasks
          } else if (tasks.length === 0) {
            // Use demo data only if we have no local tasks
            setTasks(generateDemoTasks());
          }
        } catch (error) {
          console.error('Failed to fetch tasks:', error);
          // Only use demo data if we have no local tasks
          if (tasks.length === 0) {
            setTasks(generateDemoTasks());
          }
        } finally {
          setLoading(false);
          setHydrated(true);
        }
      },

      // Create a new task via API
      createTask: async (taskData, token) => {
        const { addTask } = get();

        try {
          const response = await fetch('/api/v1/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: taskData.title,
              description: taskData.description,
              status: taskData.status,
              priority: taskData.priority,
              dueDate: taskData.dueDate,
              basePoints: taskData.basePoints,
              assigneeId: taskData.assigneeId || taskData.assignee?.id,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const newTask = data.data || data;
            addTask(newTask);
            return newTask;
          } else {
            // Fallback to local creation with demo ID
            const newTask: Task = {
              ...taskData,
              id: `local-${Date.now()}`,
              createdAt: new Date().toISOString(),
            };
            addTask(newTask);
            return newTask;
          }
        } catch (error) {
          console.error('Failed to create task:', error);
          // Fallback to local creation
          const newTask: Task = {
            ...taskData,
            id: `local-${Date.now()}`,
            createdAt: new Date().toISOString(),
          };
          addTask(newTask);
          return newTask;
        }
      },

      // Update a task via API
      updateTaskApi: async (id, updates, token) => {
        const { updateTask } = get();

        // Optimistically update local state
        updateTask(id, updates);

        try {
          const response = await fetch(`/api/v1/tasks/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          });

          return response.ok;
        } catch (error) {
          console.error('Failed to update task:', error);
          return false;
        }
      },

      // Delete a task via API
      deleteTaskApi: async (id, token) => {
        const { deleteTask, tasks } = get();
        const taskToDelete = tasks.find(t => t.id === id);

        // Optimistically delete from local state
        deleteTask(id);

        try {
          const response = await fetch(`/api/v1/tasks/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok && taskToDelete) {
            // Rollback on failure
            get().addTask(taskToDelete);
          }

          return response.ok;
        } catch (error) {
          console.error('Failed to delete task:', error);
          // Rollback on error
          if (taskToDelete) {
            get().addTask(taskToDelete);
          }
          return false;
        }
      },

      // Get tasks grouped by date (for calendar)
      getTasksByDate: () => {
        const { tasks } = get();
        const tasksByDate: Record<string, Task[]> = {};

        tasks.forEach((task) => {
          if (task.dueDate) {
            const dateKey = task.dueDate.split('T')[0];
            if (!tasksByDate[dateKey]) {
              tasksByDate[dateKey] = [];
            }
            tasksByDate[dateKey].push(task);
          }
        });

        return tasksByDate;
      },

      // Get single task by ID
      getTaskById: (id) => {
        return get().tasks.find((t) => t.id === id);
      },
    }),
    {
      name: 'taskmaster-tasks-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        lastFetched: state.lastFetched,
      }),
      // Set isHydrated when localStorage data is restored
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
