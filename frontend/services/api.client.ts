import { useAuthStore } from "@/store/useAuthStore";

const API_BASE_URL = "http://localhost:5000/api";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const apiClient = {
  async extractErrorMessage(response: Response): Promise<string> {
    const text = await response.text();
    if (!text) return "Request failed";
    try {
      const errorData = JSON.parse(text);
      if (errorData && errorData.message) {
        return errorData.message;
      }
    } catch {
      // ignore parse error
    }
    return "Request failed";
  },

  async get<T = unknown>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<T> {
    return apiClient.request<T>(endpoint, { ...options, method: "GET" });
  },

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return apiClient.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return apiClient.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async delete<T = unknown>(
    endpoint: string,
    options?: RequestOptions
  ): Promise<T> {
    return apiClient.request<T>(endpoint, { ...options, method: "DELETE" });
  },

  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return apiClient.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = true, headers = {}, ...rest } = options;

    const { token, refreshToken } = useAuthStore.getState();
    if (requiresAuth && !token) throw new Error("Authentication required");

    const requestHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (token) {
      (requestHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const makeRequest = async (authToken?: string): Promise<Response> => {
      const finalHeaders = { ...requestHeaders };
      if (authToken) {
        (finalHeaders as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
      }
      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...rest,
        headers: finalHeaders,
      });
    };

    let response = await makeRequest(token || undefined);

    // Handle 401 - try to refresh token
    if (response.status === 401 && requiresAuth && refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          const newToken = data.accessToken || data.token;
          if (newToken) {
            useAuthStore.setState({ 
              token: newToken, 
              refreshToken: data.refreshToken || refreshToken 
            });
            response = await makeRequest(newToken);
          }
        }
      } catch {
        // Refresh failed, will fall through to error handling
      }
    }

    // If still 401 after refresh, clear auth and redirect to login
    if (response.status === 401) {
      useAuthStore.setState({ user: null, token: null, refreshToken: null });
      if (typeof window !== 'undefined') {
        window.location.href = '/?expired=true';
      }
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      const message = await apiClient.extractErrorMessage(response);
      throw new Error(message);
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  },
};
