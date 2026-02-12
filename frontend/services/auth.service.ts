import {
  LoginData,
  RegisterData,
  RequestVerificationPayload,
  User,
  VerifyCodePayload,
} from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

const API_URL = "http://localhost:5000/api/auth";

interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

interface VerifyResponse {
  isAuthenticated: boolean;
  user?: User;
  message?: string;
}

export const authService = {
  // Registration now only initializes a pending user; no token/user is returned yet.
  async register(data: RegisterData): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Registration failed");
    }

    return response.json();
  },

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    return response.json();
  },

  async verifyToken(token: string): Promise<VerifyResponse> {
    const response = await fetch(`${API_URL}/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Token verification failed");
    }

    return response.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
    });
  },

  // Account verification flow (email or SMS) - backend routes must be implemented
  async requestVerification(
    data: RequestVerificationPayload
  ): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/request-verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Verification request failed");
    }

    return response.json();
  },

  async verifyCode(data: VerifyCodePayload): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/verify-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Code verification failed");
    }

    return response.json();
  },

  // Delete pending registration (for development)
  async deletePendingRegistration(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/pending-registration`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete pending registration");
    }

    return response.json();
  },

  // Magic link verification
  async verifyMagicLink(token: string, userId: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/verify-magic-link?token=${token}&userId=${userId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Magic link verification failed");
    }

    return response.json();
  },

  // Get user profile
  async getProfile(): Promise<User> {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${API_URL}/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Invalid or expired token");
      }
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch profile");
    }

    return response.json();
  },

  // Update user profile
  async updateProfile(data: { fullName?: string; phone?: string }): Promise<User> {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Invalid or expired token");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Validation error");
      }
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    return response.json();
  },

  // Change password
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const token = useAuthStore.getState().token;
    if (!token) {
      throw new Error("No authentication token found");
    }

    const response = await fetch(`${API_URL}/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Invalid or expired token");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Validation error");
      }
      const error = await response.json();
      throw new Error(error.message || "Failed to change password");
    }

    return response.json();
  },
};
