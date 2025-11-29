import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
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
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await SecureStore.deleteItemAsync('token');
      router.replace('/(auth)/login');
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

// Tasks API
export const tasksApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/tasks', { params }),

  get: (id: string) => api.get(`/tasks/${id}`),

  create: (data: { title: string; description?: string; priority?: string; dueDate?: string }) =>
    api.post('/tasks', data),

  update: (id: string, data: { status?: string; priority?: string }) =>
    api.patch(`/tasks/${id}`, data),

  delete: (id: string) => api.delete(`/tasks/${id}`),

  getMyTasks: () => api.get('/tasks/my/assigned'),
};

// Leaderboard API
export const leaderboardApi = {
  getUsers: (params?: { period?: 'all' | 'weekly' | 'monthly'; limit?: number }) =>
    api.get('/leaderboard/users', { params }),

  getTeams: (params?: { period?: 'all' | 'weekly' | 'monthly'; limit?: number }) =>
    api.get('/leaderboard/teams', { params }),
};

// Gamification API
export const gamificationApi = {
  getAchievements: () => api.get('/gamification/achievements'),
  getQuests: () => api.get('/gamification/quests'),
  getLevels: () => api.get('/gamification/levels'),
  getRanks: () => api.get('/gamification/ranks'),
};

// Points API
export const pointsApi = {
  getSummary: () => api.get('/points/summary'),
  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get('/points/history', { params }),
};

// Notifications API
export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; limit?: number }) =>
    api.get('/notifications', { params }),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export default api;
