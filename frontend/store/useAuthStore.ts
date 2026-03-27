import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, LoginData, RegisterData } from "@/types";
import { authService } from "@/services/auth.service";
import { setClientAuthTokens, clearClientAuthTokens } from "@/lib/api";

if (typeof window !== 'undefined') {
  setTimeout(() => {
    const state = useAuthStore.getState();
    if (!state.hydrated) {
      useAuthStore.setState({ hydrated: true });
    }
  }, 100);
}

interface LoginResponse {
  message: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  user?: User;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  hydrated: boolean;
  isAuthenticated: boolean;
  register: (data: RegisterData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  verifyMagicLink: (token: string, userId: string) => Promise<void>;
  deletePendingRegistration: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
  refreshAccessToken: () => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { fullName?: string; phone?: string }) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  clearError: () => void;
  setUserAndTokens: (data: { user?: User | null; token?: string; refreshToken?: string }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      hydrated: false,
      isAuthenticated: false,

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(data);
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Registration failed",
            isLoading: false,
          });
          throw error;
        }
      },

      login: async (data: LoginData) => {
        set({ isLoading: true, error: null, hydrated: true });
        try {
          const response = await authService.login(data);
          const token = response.accessToken || response.token;
          const refresh = response.refreshToken;
          
          if (token) {
            setClientAuthTokens(token, refresh);
          }
          
          set({
            user: response.user || undefined,
            token: token || undefined,
            refreshToken: refresh || undefined,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Login failed",
            isLoading: false,
          });
          throw error;
        }
      },

      verifyMagicLink: async (token: string, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.verifyMagicLink(token, userId);
          if (response.token && response.user) {
            set({
              user: response.user,
              token: response.token,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Verification failed",
            isLoading: false,
          });
          throw error;
        }
      },

      deletePendingRegistration: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.deletePendingRegistration(email);
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete pending registration",
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        // Clear everything immediately
        localStorage.removeItem('auth-storage');
        clearClientAuthTokens();
        
        // Reset store
        useAuthStore.setState({
          user: null,
          token: null,
          refreshToken: null,
          error: null,
          isAuthenticated: false,
          hydrated: true,
          isLoading: false,
        });
        
        // Hard redirect after a brief moment
        window.location.href = '/';
        setTimeout(() => window.location.reload(), 100);
      },

      verifySession: async () => {
        // Read token from cookie (source of truth)
        const { getClientAccessToken } = await import('@/lib/api');
        const cookieToken = getClientAccessToken();

        if (!cookieToken) {
          set({ user: null, token: null, isAuthenticated: false });
          return false;
        }

        const { user } = get();
        if (cookieToken && user) {
          set({ isAuthenticated: true });
          return true;
        }

        if (cookieToken && !user) {
          try {
            const { authService } = await import('@/services/auth.service');
            const response = await authService.verifyToken(cookieToken);
            if (response.isAuthenticated && response.user) {
              set({ user: response.user, token: cookieToken, isAuthenticated: true });
              return true;
            }
          } catch {
            set({ user: null, token: null, isAuthenticated: false });
            clearClientAuthTokens();
            return false;
          }
        }

        set({ user: null, token: null, isAuthenticated: false });
        return false;
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          return false;
        }

        try {
          const response = await authService.refreshToken(refreshToken);
          if (response.token) {
            set({ token: response.token });
            return true;
          }
          return false;
        } catch {
          set({ user: null, token: null, refreshToken: null });
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUserAndTokens: (data: { user?: User | null; token?: string; refreshToken?: string }) => {
        set({
          user: data.user ?? null,
          token: data.token ?? null,
          refreshToken: data.refreshToken ?? null,
          isAuthenticated: !!data.token,
        });
      },

      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.getProfile();
          set({ user, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to fetch profile",
            isLoading: false,
          });
        }
      },

      updateProfile: async (data: { fullName?: string; phone?: string }) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.updateProfile(data);
          set({ user, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to update profile",
            isLoading: false,
          });
          throw error;
        }
      },

      changePassword: async (data: { currentPassword: string; newPassword: string }) => {
        set({ isLoading: true, error: null });
        try {
          await authService.changePassword(data);
          // Password changed successfully, but token is now invalid
          // Clear user and token so they need to log in again
          set({ user: null, token: null, isLoading: false });
          throw new Error("PASSWORD_CHANGED");
        } catch (error) {
          if (error instanceof Error && error.message === "PASSWORD_CHANGED") {
            throw error;
          }
          set({
            error: error instanceof Error ? error.message : "Failed to change password",
            isLoading: false,
          });
          throw error;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          // Check if logout was triggered by checking if localStorage was cleared
          const storedData = localStorage.getItem('auth-storage');
          const hasStoredData = storedData && JSON.parse(storedData)?.state?.token;
          
          // Only rehydrate if there's actually stored data and tokens
          if (!hasStoredData) {
            // Force clear state on rehydration if no valid data
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
          }
          
          const hasUser = state.user !== null && state.user !== undefined;
          useAuthStore.setState({ 
            hydrated: true,
            isAuthenticated: hasUser && !!state.token
          });
        } else {
          useAuthStore.setState({ hydrated: true });
        }
      },
    }
  )
);
