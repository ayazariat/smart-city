import { useAuthStore } from "@/store/useAuthStore";

const API_BASE_URL = "http://localhost:5000/api";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const apiClient = {
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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...rest,
      headers: requestHeaders,
    });

    if (response.status === 401 && refreshToken && requiresAuth) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          if (data.token) {
            useAuthStore.setState({ token: data.token });
            (requestHeaders as Record<string, string>)["Authorization"] = `Bearer ${data.token}`;
            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
              ...rest,
              headers: requestHeaders,
            });

            if (!retryResponse.ok) {
              // Try to extract error message from response body
              const text = await retryResponse.text();
              if (text) {
                try {
                  const errorData = JSON.parse(text);
                  if (errorData && errorData.message) {
                    // Throw the error message to be caught below
                    throw errorData.message;
                  }
                } catch (err) {
                  // If err is a string (our message), throw it
                  if (typeof err === "string") {
                    throw new Error(err);
                  }
                  // Otherwise continue to throw generic error
                }
              }
              throw new Error("Request failed");
            }

            const text = await retryResponse.text();
            return text ? (JSON.parse(text) as T) : ({} as T);
          }
        }
      } catch {
        useAuthStore.setState({ user: null, token: null, refreshToken: null });
        throw new Error("Session expired. Please log in again.");
      }
    }

    if (!response.ok) {
      // Try to extract error message from response body
      const text = await response.text();
      if (text) {
        try {
          const errorData = JSON.parse(text);
          if (errorData && errorData.message) {
            // Throw the error message to be caught below
            throw errorData.message;
          }
        } catch (err) {
          // If err is a string (our message), throw it
          if (typeof err === "string") {
            throw new Error(err);
          }
          // Otherwise continue to throw generic error
        }
      }
      throw new Error("Request failed");
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  },
};
