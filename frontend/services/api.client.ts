import { useAuthStore } from "@/store/useAuthStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const apiClient = {
  async extractErrorMessage(response: Response): Promise<string> {
    const contentType = response.headers.get("content-type") || "";
    const status = response.status;
    
    // Default messages per status (used as fallbacks)
    const defaultMessages: Record<number, string> = {
      401: "Session expired",
      403: "Access denied",
      404: "Resource not found",
    };
    
    if (contentType.includes("text/html")) {
      return defaultMessages[status] || `Request failed (${status})`;
    }
    
    const text = await response.text();
    if (!text) return defaultMessages[status] || `Request failed (${status})`;
    
    try {
      const errorData = JSON.parse(text);
      if (errorData && errorData.message) {
        return errorData.message;
      }
      if (errorData && errorData.error) {
        return errorData.error;
      }
      if (errorData && errorData.msg) {
        return errorData.msg;
      }
    } catch {
      if (text) return text.substring(0, 200);
    }
    return `Request failed (${status})`;
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

    // Wait for hydration and get fresh state
    let attempts = 0;
    while (attempts < 10) {
      const state = useAuthStore.getState();
      if (state.hydrated || state.token) break;
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    const { token, refreshToken, hydrated, user } = useAuthStore.getState();

    if (!hydrated && requiresAuth) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const freshState = useAuthStore.getState();
      if (!freshState.hydrated || !freshState.token) {
        throw new Error("Session not ready. Please refresh page or login again.");
      }
    }
    
    if (requiresAuth && (!token || !user)) {
      // Allow request to proceed without auth header so callers can
      // handle 401/403 gracefully or fallback to public endpoints.
      // This avoids hard client-side failures on hydration edge cases.
    }

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
        credentials: "include",
        headers: finalHeaders,
      });
    };

    let response = await makeRequest(token || undefined);

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
        // Refresh failed
      }
    }

    if (response.status === 403) {
      const message = await apiClient.extractErrorMessage(response);
      throw new Error(message || "Access denied - You don't have permission for this action");
    }

    if (response.status === 401) {
      useAuthStore.setState({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      // Redirect to login so the user knows they need to re-authenticate
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
      const message = await apiClient.extractErrorMessage(response);
      throw new Error(message || "Request failed");
    }

    const text = await response.text();
    
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json") && text) {
      return text as unknown as T;
    }
    
    return text ? (JSON.parse(text) as T) : ({} as T);
  },
};
