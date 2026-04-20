/**
 * API Client with Cookie-based Token Storage
 * 
 * This module provides a centralized API client that:
 * - Stores accessToken and refreshToken in cookies
 * - Automatically attaches Bearer token to every request
 * - Handles 401 errors by refreshing the token
 * - Clears cookies on logout
 */

// API Base URL - configure per environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Cookie names
const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Custom API Request Options extending standard RequestInit
 */
export interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Get access token from cookies (server-side)
 */
export async function getAccessToken(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

/**
 * Get refresh token from cookies (server-side)
 */
export async function getRefreshToken(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

/**
 * Set auth cookies (server-side)
 */
export async function setAuthCookies(accessToken: string, refreshToken?: string): Promise<void> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    
    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    if (refreshToken) {
      cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });
    }
  } catch {
    // Silent fail - cookies may not be available server-side
  }
}

/**
 * Clear auth cookies (server-side)
 */
export async function clearAuthCookies(): Promise<void> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(REFRESH_TOKEN_COOKIE);
  } catch {
    // Silent fail - cookies may not be available server-side
  }
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Fetch wrapper with auth handling (Server-side)
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { 
    headers = {}, 
    method = "GET",
    body,
    requiresAuth = true,
    ...rest 
  } = options;

  // Build request headers
  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Attach Bearer token if required
  if (requiresAuth) {
    const token = await getAccessToken();
    if (token) {
      (requestHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    ...rest,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

  // Detect HTML response (backend error page instead of JSON)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('API returned HTML. Check NEXT_PUBLIC_API_URL is correct.');
  }

  // Handle 401 - try to refresh token
  if (response.status === 401 && requiresAuth) {
    const refreshToken = await getRefreshToken();
    
    if (refreshToken) {
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
            // Set new tokens in cookies
            await setAuthCookies(newToken, data.refreshToken || refreshToken);
            
            // Retry original request with new token
            (requestHeaders as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
            
            const retryFetchOptions: RequestInit = {
              method,
              headers: requestHeaders,
              ...rest,
            };

            if (body !== undefined) {
              retryFetchOptions.body = JSON.stringify(body);
            }

            const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, retryFetchOptions);

            if (retryResponse.ok) {
              // Detect HTML response in retry
              const retryContentType = retryResponse.headers.get('content-type') || '';
              if (retryContentType.includes('text/html')) {
                throw new Error('API returned HTML. Check NEXT_PUBLIC_API_URL is correct.');
              }
              
              const text = await retryResponse.text();
              return text ? JSON.parse(text) : ({} as T);
            }

            // If retry still fails, check if it's still 401
            if (retryResponse.status === 401) {
              await clearAuthCookies();
              redirectToAuth();
            }

            const errorText = await retryResponse.text();
            const errorData = errorText ? JSON.parse(errorText) : {};
            throw new ApiError(
              errorData.message || "Request failed",
              retryResponse.status,
              errorData.code
            );
          }
        }
      } catch {
        // Refresh failed
        await clearAuthCookies();
        redirectToAuth();
      }
    } else {
      // No refresh token, redirect to auth
      await clearAuthCookies();
      redirectToAuth();
    }
  }

  // Handle other error statuses
  if (!response.ok) {
    const errorText = await response.text();
    const errorData = errorText ? JSON.parse(errorText) : {};
    
    throw new ApiError(
      errorData.message || "Request failed",
      response.status,
      errorData.code
    );
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

/**
 * Redirect to auth page - ONLY call this on explicit logout
 */
export function redirectToAuth(): void {
  if (typeof window === 'undefined') return

  const { pathname } = window.location
  const publicPaths = ['/', '/register', '/forgot-password',
                       '/reset-password', '/verify-account', '/set-password']

  // Already on public page → do nothing
  if (publicPaths.some(p => pathname === p)) return

  window.location.href = '/'
}

/**
 * GET request
 */
export async function apiGet<T = unknown>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: "GET" });
}

/**
 * POST request
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: "POST", body: body as BodyInit | undefined });
}

/**
 * PUT request
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: "PUT", body: body as BodyInit | undefined });
}

/**
 * PATCH request
 */
export async function apiPatch<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: "PATCH", body: body as BodyInit | undefined });
}

/**
 * DELETE request
 */
export async function apiDelete<T = unknown>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(endpoint, { ...options, method: "DELETE" });
}

// ============================================
// Client-side API Client
// Uses document.cookie for token storage
// ============================================

// Cookie helpers for client-side
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  // Simple and reliable cookie reading
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }
  return undefined;
}

function setCookie(name: string, value: string, maxAge: number = 7 * 24 * 60 * 60): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  
  // Delete with multiple path combinations to ensure complete cleanup
  const paths = ['/', ''];
  const sameSites = ['', '; SameSite=Lax'];
  
  paths.forEach(path => {
    sameSites.forEach(sameSite => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${sameSite}`;
    });
  });
  
  // Also try to clear any other possible variations
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`;
  document.cookie = `${name}=; max-age=0; path=/`;
}

/**
 * Client-side fetch with automatic token refresh
 */
export async function clientApiFetch<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { 
    headers = {}, 
    method = "GET",
    body,
    requiresAuth = true,
    ...rest 
  } = options;

  // Early return for notifications when not authenticated
  if (requiresAuth) {
    const token = getCookie(ACCESS_TOKEN_COOKIE);
    const isNotificationEndpoint = 
      endpoint.includes('/notifications') ||
      endpoint.includes('/notifications/count');
    
    if (!token && isNotificationEndpoint) {
      // Return empty data for notification endpoints when not authenticated
      return {} as T;
    }
  }

  const requestHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (requiresAuth) {
    const token = getCookie(ACCESS_TOKEN_COOKIE);
    if (token) {
      (requestHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    ...rest,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

  // Handle 401 - try to refresh token
  if (response.status === 401 && requiresAuth) {
    const refreshToken = getCookie(REFRESH_TOKEN_COOKIE);
    
    if (refreshToken) {
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
            setCookie(ACCESS_TOKEN_COOKIE, newToken);
            if (data.refreshToken) {
              setCookie(REFRESH_TOKEN_COOKIE, data.refreshToken);
            }
            
            // Retry with new token
            (requestHeaders as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
            
            const retryFetchOptions: RequestInit = {
              method,
              headers: requestHeaders,
              ...rest,
            };

            if (body !== undefined) {
              retryFetchOptions.body = JSON.stringify(body);
            }

            response = await fetch(`${API_BASE_URL}${endpoint}`, retryFetchOptions);

            if (response.ok) {
              const text = await response.text();
              return text ? JSON.parse(text) : ({} as T);
            }

            if (response.status === 401) {
              const isBackgroundRequest = 
                endpoint.includes('/notifications') ||
                endpoint.includes('/count');
              
              if (!isBackgroundRequest) {
                deleteCookie(ACCESS_TOKEN_COOKIE);
                deleteCookie(REFRESH_TOKEN_COOKIE);
              }
              throw new ApiError('Authentication required', 401);
            }
          }
        }
      } catch {
        deleteCookie(ACCESS_TOKEN_COOKIE);
        deleteCookie(REFRESH_TOKEN_COOKIE);
      }
    } else {
      deleteCookie(ACCESS_TOKEN_COOKIE);
      deleteCookie(REFRESH_TOKEN_COOKIE);
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    const errorData = errorText ? JSON.parse(errorText) : {};
    
    if (response.status === 403) {
      return {} as T;
    }
    
    throw new ApiError(
      errorData.message || "Request failed",
      response.status,
      errorData.code
    );
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

/**
 * Client-side GET
 */
export const clientGet = <T = unknown>(endpoint: string, options?: ApiRequestOptions) =>
  clientApiFetch<T>(endpoint, { ...options, method: "GET" });

/**
 * Client-side POST
 */
export const clientPost = <T = unknown>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
  clientApiFetch<T>(endpoint, { ...options, method: "POST", body: body as BodyInit | undefined });

/**
 * Client-side PUT
 */
export const clientPut = <T = unknown>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
  clientApiFetch<T>(endpoint, { ...options, method: "PUT", body: body as BodyInit | undefined });

/**
 * Client-side PATCH
 */
export const clientPatch = <T = unknown>(endpoint: string, body?: unknown, options?: ApiRequestOptions) =>
  clientApiFetch<T>(endpoint, { ...options, method: "PATCH", body: body as BodyInit | undefined });

/**
 * Client-side DELETE
 */
export const clientDelete = <T = unknown>(endpoint: string, options?: ApiRequestOptions) =>
  clientApiFetch<T>(endpoint, { ...options, method: "DELETE" });

/**
 * Set auth tokens on client
 */
export function setClientAuthTokens(accessToken: string, refreshToken?: string): void {
  setCookie(ACCESS_TOKEN_COOKIE, accessToken);
  if (refreshToken) {
    setCookie(REFRESH_TOKEN_COOKIE, refreshToken);
  }
}

/**
 * Clear auth tokens on client
 */
export function clearClientAuthTokens(): void {
  if (typeof document === 'undefined') return;

  const cookieNames = ['accessToken', 'refreshToken'];
  const paths = ['/', '/dashboard', ''];
  const isProduction = process.env.NODE_ENV === "production";

  cookieNames.forEach(name => {
    paths.forEach(path => {
      const base = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
      document.cookie = base;
      document.cookie = `${base}; SameSite=Lax`;
      if (isProduction) {
        document.cookie = `${base}; SameSite=Lax; Secure`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; Secure`;
      }
    });
  });
  
  document.cookie = `accessToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`;
  document.cookie = `refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`;
}

/**
 * Get current access token on client
 */
export function getClientAccessToken(): string | undefined {
  return getCookie(ACCESS_TOKEN_COOKIE);
}

export {
  API_BASE_URL,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
};
