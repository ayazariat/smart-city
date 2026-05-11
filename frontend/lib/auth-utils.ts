/**
 * Centralized authentication utilities for handling login redirects
 */

const LOGIN_RETURN_URL_KEY = 'loginReturnUrl';

/**
 * Save the current URL to sessionStorage before redirecting to login.
 * This allows the user to be redirected back after successful login.
 */
export function saveReturnUrl(): void {
  if (typeof window === 'undefined') return;

  // Always save the current full URL (overwrite previous)
  sessionStorage.setItem(LOGIN_RETURN_URL_KEY, window.location.pathname + window.location.search);
}

/**
 * Get the saved return URL from sessionStorage.
 * Returns null if no URL is saved.
 */
export function getReturnUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(LOGIN_RETURN_URL_KEY);
}

/**
 * Clear the saved return URL from sessionStorage.
 */
export function clearReturnUrl(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(LOGIN_RETURN_URL_KEY);
}

/**
 * Redirect to login page, saving the current URL for later return.
 * @param router - Next.js router instance
 */
export function redirectToLogin(router: any): void {
  saveReturnUrl();
  router.push('/login');
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
