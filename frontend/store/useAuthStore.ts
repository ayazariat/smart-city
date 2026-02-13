import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, LoginData, RegisterData } from "@/types";
import { authService } from "@/services/auth.service";

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

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(data);
          // No user/token stored yet: account will be created after verification.
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
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(data);
          set({
            user: response.user || undefined,
            token: response.token || response.accessToken || undefined,
            refreshToken: response.refreshToken || undefined,
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
        try {
          const { token } = get();
          if (token) {
            await authService.logout();
          }
        } catch {
        } finally {
          set({ user: null, token: null, refreshToken: null, error: null });
        }
      },

      verifySession: async () => {
        const { token, user } = get();
        
        // If we have a token but no user yet, try to get profile from API
        if (token && !user) {
          try {
            const response = await authService.verifyToken(token);
            if (response.isAuthenticated && response.user) {
              set({ user: response.user });
              return true;
            }
          } catch {
            set({ user: null, token: null });
            return false;
          }
        }
        
        // If we have both token and user from persisted storage, session is valid
        if (token && user) {
          return true;
        }
        
        // No token, session is invalid
        set({ user: null, token: null });
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
      }),
    }
  )
);
