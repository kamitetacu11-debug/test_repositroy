import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),

  me: () => api.get('/auth/me'),

  refresh: () => api.post('/auth/refresh'),

  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; limit?: number; teamId?: string; search?: string }) =>
    api.get('/users', { params }),

  get: (id: string) => api.get(`/users/${id}`),

  update: (id: string, data: Partial<{ firstName: string; lastName: string; avatar: string }>) =>
    api.patch(`/users/${id}`, data),

  getStats: (id: string) => api.get(`/users/${id}/stats`),

  getActivity: (id: string, limit?: number) =>
    api.get(`/users/${id}/activity`, { params: { limit } }),
};

// Tasks API
export const tasksApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assigneeId?: string;
    teamId?: string;
    search?: string;
  }) => api.get('/tasks', { params }),

  get: (id: string) => api.get(`/tasks/${id}`),

  create: (data: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
    teamId?: string;
    basePoints?: number;
  }) => api.post('/tasks', data),

  update: (id: string, data: Partial<{
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: string;
    assigneeId: string;
  }>) => api.patch(`/tasks/${id}`, data),

  delete: (id: string) => api.delete(`/tasks/${id}`),

  addComment: (id: string, content: string) =>
    api.post(`/tasks/${id}/comments`, { content }),

  getMyTasks: () => api.get('/tasks/my/assigned'),
};

// Teams API
export const teamsApi = {
  list: (departmentId?: string) =>
    api.get('/teams', { params: { departmentId } }),

  get: (id: string) => api.get(`/teams/${id}`),

  create: (data: { name: string; description?: string; departmentId?: string }) =>
    api.post('/teams', data),

  update: (id: string, data: Partial<{ name: string; description: string }>) =>
    api.patch(`/teams/${id}`, data),

  addMember: (teamId: string, userId: string) =>
    api.post(`/teams/${teamId}/members`, { userId }),

  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),

  getStats: (id: string) => api.get(`/teams/${id}/stats`),

  getActivity: (id: string, limit?: number) =>
    api.get(`/teams/${id}/activity`, { params: { limit } }),
};

// Points API
export const pointsApi = {
  getHistory: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/points/history', { params }),

  getSummary: () => api.get('/points/summary'),

  award: (targetUserId: string, points: number, reason: string) =>
    api.post('/points/award', { targetUserId, points, reason }),
};

// Leaderboard API
export const leaderboardApi = {
  getUsers: (params?: { period?: 'all' | 'weekly' | 'monthly'; limit?: number }) =>
    api.get('/leaderboard/users', { params }),

  getTeams: (params?: { period?: 'all' | 'weekly' | 'monthly'; limit?: number }) =>
    api.get('/leaderboard/teams', { params }),

  getDepartments: () => api.get('/leaderboard/departments'),
};

// Gamification API
export const gamificationApi = {
  getAchievements: () => api.get('/gamification/achievements'),

  getMyAchievements: () => api.get('/gamification/achievements/my'),

  getQuests: () => api.get('/gamification/quests'),

  getCompetitions: () => api.get('/gamification/competitions'),

  getLevels: () => api.get('/gamification/levels'),

  getRanks: () => api.get('/gamification/ranks'),
};

// AI API
export const aiApi = {
  analyzeTask: (title: string, description?: string) =>
    api.post('/ai/analyze-task', { title, description }),

  predictWorkload: (userId: string) =>
    api.get(`/ai/predict-workload/${userId}`),

  getAnomalies: (teamId?: string) =>
    api.get('/ai/anomalies', { params: { teamId } }),

  getRecommendations: () => api.get('/ai/recommendations'),

  getInsights: () => api.get('/ai/insights'),
};

// Notifications API
export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; limit?: number }) =>
    api.get('/notifications', { params }),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch('/notifications/read-all'),

  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export default api;
