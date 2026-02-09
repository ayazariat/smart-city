import { LoginData, RegisterData, User } from "@/types";

const API_URL = "http://localhost:5000/api/auth";

interface AuthResponse {
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
  async register(data: RegisterData): Promise<AuthResponse> {
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

  async login(data: LoginData): Promise<AuthResponse> {
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
};
