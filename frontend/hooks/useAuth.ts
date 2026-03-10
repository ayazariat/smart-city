'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { User } from '@/types';

// Query key for user profile
export const authKeys = {
  user: ['auth', 'user'] as const,
  profile: ['auth', 'profile'] as const,
};

// Get user role from JWT token (without making API call)
export function useUserRole() {
  const { user, token } = useAuthStore();

  // Return role from stored user or extract from token
  if (user?.role) {
    return user.role;
  }

  // If we have a token but no user, extract role from token
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role as User['role'];
    } catch {
      return null;
    }
  }

  return null;
}

// Check if user has specific role
export function useHasRole(...roles: User['role'][]) {
  const userRole = useUserRole();
  return roles.includes(userRole as User['role']);
}

// Check if user is citizen
export function useIsCitizen() {
  const { user } = useAuthStore();
  return user?.role === 'CITIZEN';
}

// Check if user is municipal agent
export function useIsAgent() {
  const { user } = useAuthStore();
  return user?.role === 'MUNICIPAL_AGENT';
}

// Check if user is technician
export function useIsTechnician() {
  const { user } = useAuthStore();
  return user?.role === 'TECHNICIAN';
}

// Check if user is department manager
export function useIsManager() {
  const { user } = useAuthStore();
  return user?.role === 'DEPARTMENT_MANAGER';
}

// Check if user is admin
export function useIsAdmin() {
  const { user } = useAuthStore();
  return user?.role === 'ADMIN';
}

// Check if user is authenticated
export function useIsAuthenticated() {
  const { token, user } = useAuthStore();
  return !!token && !!user;
}

// Get user profile (with caching)
export function useUserProfile() {
  const { fetchProfile } = useAuthStore();

  return useQuery({
    queryKey: authKeys.profile,
    queryFn: () => fetchProfile(),
    enabled: false, // Only fetch when explicitly needed
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get current user from store
export function useCurrentUser() {
  const { user, token } = useAuthStore();
  return { user, token, isAuthenticated: !!token && !!user };
}

// Role check helpers
export type UserRole = User['role'];

export const ROLE_LABELS: Record<UserRole, string> = {
  CITIZEN: 'Citoyen',
  MUNICIPAL_AGENT: 'Agent Municipal',
  DEPARTMENT_MANAGER: 'Chef de Service',
  TECHNICIAN: 'Technicien',
  ADMIN: 'Administrateur',
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  CITIZEN: ['create_complaint', 'view_own_complaints'],
  MUNICIPAL_AGENT: ['validate_complaint', 'view_all_complaints'],
  TECHNICIAN: ['update_complaint', 'view_assigned_complaints'],
  DEPARTMENT_MANAGER: ['assign_complaint', 'manage_team', 'view_department_complaints'],
  ADMIN: ['manage_users', 'manage_system', 'view_all_complaints', 'archive_complaint'],
};

// Check if user has specific permission
export function useHasPermission(permission: string) {
  const userRole = useUserRole();
  if (!userRole) return false;
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
}
