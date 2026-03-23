/**
 * Next.js Proxy for Authentication (formerly Middleware)
 * 
 * Protects routes based on authentication status and user role.
 * Allows public access to specific paths.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/auth",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-account",
  "/set-password",
  "/api/auth",
  "/api/upload",
  "/public",
  "/_next",
  "/favicon.ico",
  "/static",
];

// Paths that require specific roles
const ROLE_BASED_PATHS = {
  "/admin": ["ADMIN"],
  "/archive": ["ADMIN"],
  "/manager": ["DEPARTMENT_MANAGER", "ADMIN"],
  "/agent": ["MUNICIPAL_AGENT", "DEPARTMENT_MANAGER", "ADMIN"],
  "/technician": ["TECHNICIAN", "DEPARTMENT_MANAGER", "ADMIN"],
};

/**
 * Check if path is public
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) => 
      pathname === publicPath || 
      pathname.startsWith(publicPath + "/") ||
      pathname.includes("/api/auth/") ||
      pathname.includes("/_next/")
  );
}

/**
 * Extract token from request
 */
function getToken(request: NextRequest): string | undefined {
  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookie
  return request.cookies.get("accessToken")?.value;
}

/**
 * Extract user role from JWT token
 */
function getUserRoleFromToken(token: string): string | null {
  try {
    // JWT format: header.payload.signature
    const payload = token.split(".")[1];
    if (!payload) return null;

    // Decode base64
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const json = JSON.parse(decoded);
    
    return json.role || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has required role
 */
function hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Handle expired token - redirect to login
 */
function handleExpiredToken(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  
  // Don't redirect if already on public path
  const publicPaths = ['/', '/auth', '/register', '/forgot-password', '/reset-password', '/verify-account', '/set-password'];
  if (publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }
  
  // Check if already has expired param - don't add it again
  if (request.nextUrl.searchParams.get('expired') === 'true') {
    return NextResponse.next();
  }
  
  const loginUrl = new URL("/", request.url);
  loginUrl.searchParams.set("expired", "true");
  return NextResponse.redirect(loginUrl);
}

/**
 * Main proxy function (also exported as default)
 */
export function proxy(request: NextRequest) {
  return proxyHandler(request);
}

// Also export as default for compatibility
export default function(request: NextRequest) {
  return proxyHandler(request);
}

function proxyHandler(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check token from cookie OR Authorization header
  let token = request.cookies.get('accessToken')?.value;
  
  // If no cookie, check Authorization header
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // CRITICAL: Never redirect if already on login page with expired=true
  // This prevents infinite redirect loops
  if (pathname === '/' && request.nextUrl.searchParams.get('expired') === 'true') {
    return NextResponse.next();
  }

  // Public paths - never redirect these (include API routes)
  const publicPaths = ['/', '/auth', '/register', '/forgot-password', '/reset-password', '/verify-account', '/set-password', '/public', '/api/auth', '/api/upload'];
  
  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.includes('/api/auth/') || pathname.includes('/api/upload/'));

  // Already on public page - never redirect (breaks loop)
  if (isPublic) return NextResponse.next();

  // No token on protected page - redirect to login ONCE
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('expired', 'true');
    return NextResponse.redirect(url);
  }

  // Get user role from token
  const userRole = getUserRoleFromToken(token);

  if (!userRole) {
    // Invalid token - clear and redirect
    const response = handleExpiredToken(request);
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    return response;
  }

  // Check role-based access
  for (const [basePath, allowedRoles] of Object.entries(ROLE_BASED_PATHS)) {
    if (pathname.startsWith(basePath)) {
      if (!hasRequiredRole(userRole, allowedRoles)) {
        // Redirect to dashboard if user doesn't have required role
        const dashboardUrl = new URL("/dashboard", request.url);
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return NextResponse.next();
}

/**
 * Configure which routes the proxy runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
