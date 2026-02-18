import { apiClient } from "./api.client";

export type UserRole = "CITIZEN" | "MUNICIPAL_AGENT" | "DEPARTMENT_MANAGER" | "TECHNICIAN" | "ADMIN";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  governorate?: string;
  municipality?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface UsersResponse {
  users: AdminUser[];
  pagination: UserPagination;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Array<{
    _id: UserRole;
    count: number;
    active: number;
    inactive: number;
  }>;
}

export interface CreateUserData {
  fullName: string;
  email: string;
  role?: UserRole;
  phone?: string;
  governorate?: string;
  municipality?: string;
}

export interface UpdateUserData {
  fullName?: string;
  phone?: string;
  isActive?: boolean;
  governorate?: string;
  municipality?: string;
}

export interface UpdateRoleData {
  role: UserRole;
}

// Tunisia geography types
export interface GovernorateData {
  governorate: string;
  municipalities: string[];
}

/**
 * Wrapper type for API responses
 */
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Admin service for managing users
 */
export const adminService = {
  /**
   * Get all users with pagination
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<UsersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.limit) queryParams.set("limit", params.limit.toString());
    if (params?.search) queryParams.set("search", params.search);

    const query = queryParams.toString();
    const endpoint = `/admin/users${query ? `?${query}` : ""}`;

    const response = await apiClient.get<ApiResponse<{ users: AdminUser[]; pagination: UserPagination }>>(endpoint);
    return response.data;
  },

  /**
   * Get single user by ID
   */
  async getUser(id: string): Promise<AdminUser> {
    const response = await apiClient.get<ApiResponse<AdminUser>>(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<AdminUser> {
    const response = await apiClient.post<ApiResponse<AdminUser>>("/admin/users", data);
    return response.data;
  },

  /**
   * Update user details
   */
  async updateUser(id: string, data: UpdateUserData): Promise<AdminUser> {
    const response = await apiClient.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, data);
    return response.data;
  },

  /**
   * Update user role
   */
  async updateUserRole(id: string, data: UpdateRoleData): Promise<AdminUser> {
    const response = await apiClient.put<ApiResponse<AdminUser>>(`/admin/users/${id}/role`, data);
    return response.data;
  },

  /**
   * Toggle user active status
   */
  async toggleUserActive(id: string, isActive: boolean): Promise<AdminUser> {
    const response = await apiClient.put<ApiResponse<AdminUser>>(`/admin/users/${id}/active`, { isActive });
    return response.data;
  },

  /**
   * Delete user permanently
   */
  async deleteUser(id: string): Promise<{ id: string }> {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`/admin/users/${id}`);
    return response.data;
  },

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    const response = await apiClient.get<ApiResponse<UserStats>>("/admin/users/stats");
    return response.data;
  },

  /**
   * Get Tunisia geography (governorates and municipalities)
   */
  async getGeography(): Promise<GovernorateData[]> {
    const response = await apiClient.get<ApiResponse<GovernorateData[]>>("/admin/geography");
    return response.data;
  },
};
