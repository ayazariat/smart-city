/**
 * Centralized authentication utilities for handling login redirects
 */
import { useAuthStore } from '@/store/useAuthStore';

const LOGIN_RETURN_URL_KEY = 'returnAfterLogin';
const LEGACY_LOGIN_RETURN_URL_KEY = 'loginReturnUrl';

function isValidReturnPath(path: string | null): path is string {
  return (
    !!path &&
    path.startsWith('/') &&
    !path.startsWith('/login') &&
    path !== '/dashboard'
  );
}

/**
 * Save the current URL to sessionStorage before redirecting to login.
 * This allows the user to be redirected back after successful login.
 */
export function saveReturnUrl(): void {
  if (typeof window === 'undefined') return;

  const currentPath = window.location.pathname + window.location.search;
  if (!isValidReturnPath(currentPath)) return;
  const existing =
    sessionStorage.getItem(LOGIN_RETURN_URL_KEY) ||
    sessionStorage.getItem(LEGACY_LOGIN_RETURN_URL_KEY);
  if (isValidReturnPath(existing)) return;

  sessionStorage.setItem(LOGIN_RETURN_URL_KEY, currentPath);
}

/**
 * Get the saved return URL from sessionStorage.
 * Returns null if no URL is saved.
 */
export function getReturnUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const returnUrl =
    sessionStorage.getItem(LOGIN_RETURN_URL_KEY) ||
    sessionStorage.getItem(LEGACY_LOGIN_RETURN_URL_KEY);
  return isValidReturnPath(returnUrl) ? returnUrl : null;
}

/**
 * Clear the saved return URL from sessionStorage.
 */
export function clearReturnUrl(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LOGIN_RETURN_URL_KEY);
  sessionStorage.removeItem(LEGACY_LOGIN_RETURN_URL_KEY);
}

/**
 * Redirect to login page, saving the current URL for later return.
 * @param router - Next.js router instance
 */
export function redirectToLogin(router: any): void {
  saveReturnUrl();
  router.push('/login');
}

export function requireAuthThenAction(
  router: any,
  actionCallback: () => void | Promise<void>
): void {
  const { user, token, hydrated, isLoading } = getAuthState();
  if (!hydrated || isLoading) return;
  if (user && token) {
    void actionCallback();
    return;
  }
  redirectToLogin(router);
}

/**
 * Use the saved return URL after successful login.
 * Returns the URL to redirect to, or a default if none is saved.
 */
export function useReturnUrl(defaultUrl: string = '/dashboard'): string {
  const returnUrl = getReturnUrl();
  clearReturnUrl(); // Clear after reading to prevent reuse
  return returnUrl || defaultUrl;
}

function getAuthState() {
  return useAuthStore.getState();
}
