/**
 * Next.js Middleware for Authentication
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
  const loginUrl = new URL("/", request.url);
  loginUrl.searchParams.set("expired", "true");
  return NextResponse.redirect(loginUrl);
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get token
  const token = getToken(request);

  // No token - redirect to login for protected routes
  if (!token) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
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
 * Configure which routes the middleware runs on
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
