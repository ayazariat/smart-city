import { useAuthStore } from "@/store/useAuthStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const apiClient = {
  async extractErrorMessage(response: Response): Promise<string> {
    const contentType = response.headers.get("content-type") || "";
    const status = response.status;
    
    if (status === 403) return "Access denied";
    if (status === 404) return "Resource not found";
    if (status === 401) return "Session expired";
    
    if (contentType.includes("text/html")) {
      return `Request failed (${status})`;
    }
    
    const text = await response.text();
    if (!text) return `Request failed (${status})`;
    
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

    const { token, refreshToken, hydrated } = useAuthStore.getState();
    
    if (!hydrated) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const state = useAuthStore.getState();
      if (!state.token) {
        if (requiresAuth) {
          console.log("Not hydrated or no token for:", endpoint);
          return {} as T;
        }
      }
    }
    
    if (requiresAuth && !token) {
      console.log("No token available for:", endpoint);
      return {} as T;
    }

    const requestHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (token) {
      (requestHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      console.log("Making authenticated request to:", endpoint);
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
      useAuthStore.setState({ user: null, token: null, refreshToken: null });
      // Don't redirect - let the app handle auth errors gracefully
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
