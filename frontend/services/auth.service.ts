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
  accessToken?: string;
  refreshToken?: string;
  user: User;
}

interface RefreshResponse {
  token: string;
  refreshToken?: string;
}

interface VerifyResponse {
  isAuthenticated: boolean;
  user?: User;
  message?: string;
}

export const authService = {
  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await fetch(`${API_URL}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Token refresh failed");
    }

    return response.json();
  },

  async register(data: RegisterData): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Login failed");
    }

    return response.json();
  },

  async verifyToken(token: string): Promise<VerifyResponse> {
    const { refreshToken } = useAuthStore.getState();
    
    const response = await fetch(`${API_URL}/verify`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status === 401 && refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_URL}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.token) {
            useAuthStore.setState({ token: data.token });
            const retryResponse = await fetch(`${API_URL}/verify`, {
              method: "GET",
              headers: { Authorization: `Bearer ${data.token}` },
            });
            
            if (retryResponse.ok) {
              return retryResponse.json();
            }
          }
        }
      } catch {
        useAuthStore.setState({ user: null, token: null, refreshToken: null });
        return { isAuthenticated: false };
      }
      useAuthStore.setState({ user: null, token: null, refreshToken: null });
      return { isAuthenticated: false };
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Token verification failed");
    }

    return response.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_URL}/logout`, { method: "POST" });
  },

  async requestVerification(
    data: RequestVerificationPayload
  ): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/request-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Code verification failed");
    }

    return response.json();
  },

  async deletePendingRegistration(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/pending-registration`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete pending registration");
    }

    return response.json();
  },

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

  async getProfile(): Promise<User> {
    const { token, refreshToken } = useAuthStore.getState();
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(`${API_URL}/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok && response.status === 401 && refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_URL}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.token) {
            useAuthStore.setState({ token: data.token });
            const retryResponse = await fetch(`${API_URL}/profile`, {
              method: "GET",
              headers: { Authorization: `Bearer ${data.token}` },
            });
            
            if (retryResponse.ok) {
              return retryResponse.json();
            }
          }
        }
      } catch {
        useAuthStore.setState({ user: null, token: null, refreshToken: null });
        throw new Error("Session expired. Please log in again.");
      }
      useAuthStore.setState({ user: null, token: null, refreshToken: null });
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch profile");
    }

    return response.json();
  },

  async updateProfile(data: { fullName?: string; phone?: string }): Promise<User> {
    const { token, refreshToken } = useAuthStore.getState();
    if (!token) throw new Error("No authentication token found");

    const makeRequest = async (authToken: string) => {
      const response = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(data),
      });
      return response;
    };

    let response = await makeRequest(token);

    if (!response.ok && response.status === 401 && refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_URL}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.token) {
            useAuthStore.setState({ token: data.token });
            if (data.refreshToken) {
              useAuthStore.setState({ refreshToken: data.refreshToken });
            }
            const newToken = data.token;
            if (newToken) {
              response = await makeRequest(newToken);
            }
          }
        }
      } catch {
        useAuthStore.setState({ user: null, token: null, refreshToken: null });
        throw new Error("Session expired. Please log in again.");
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    return response.json();
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const { token } = useAuthStore.getState();
    if (!token) throw new Error("No authentication token found");

    const response = await fetch(`${API_URL}/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to change password");
    }

    return response.json();
  },
};
