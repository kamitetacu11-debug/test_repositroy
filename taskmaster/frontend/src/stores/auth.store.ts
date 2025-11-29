import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, usersApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  totalPoints: number;
  currentLevel: number;
  currentRank: string;
  teamId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  updateAvatar: (avatarData: string) => Promise<void>;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, password);
          const { user, token } = response.data.data;

          localStorage.setItem('token', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          const { user, token } = response.data.data;

          localStorage.setItem('token', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      fetchUser: async () => {
        const token = get().token || localStorage.getItem('token');
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await authApi.me();
          const serverUser = response.data.data;
          const currentUser = get().user;

          // Preserve local avatar if server doesn't have one
          const mergedUser = {
            ...serverUser,
            avatar: serverUser.avatar || currentUser?.avatar,
          };

          set({
            user: mergedUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
          localStorage.removeItem('token');
        }
      },

      updateUser: (data) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...data } });
        }
      },

      updateAvatar: async (avatarData: string) => {
        const currentUser = get().user;
        if (!currentUser) return;

        // Update local state immediately for instant feedback
        set({ user: { ...currentUser, avatar: avatarData } });

        // Try to sync with server (will fail gracefully if server doesn't support base64)
        try {
          await usersApi.update(currentUser.id, { avatar: avatarData });
        } catch (error) {
          // Server may not support base64, but we still save locally
          console.log('Avatar saved locally. Server sync skipped.');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user ? { ...state.user } : null,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        // Always set hydrated to true, even on error
        if (error) {
          console.error('Auth hydration error:', error);
          useAuthStore.setState({ _hasHydrated: true });
          return;
        }

        // Called after hydration is complete
        if (state) {
          state.setHasHydrated(true);

          // If we have a token but not authenticated, set authenticated
          if (state.token && state.user && !state.isAuthenticated) {
            useAuthStore.setState({ isAuthenticated: true });
          }
        } else {
          // State is null/undefined - still mark as hydrated
          useAuthStore.setState({ _hasHydrated: true });
        }
      },
    }
  )
);

// Hook to wait for hydration
export const useAuthHydration = () => {
  return useAuthStore((state) => state._hasHydrated);
};
