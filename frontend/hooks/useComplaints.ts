'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api.client';
import { Complaint, CreateComplaintData } from '@/types';

// Query keys
export const complaintKeys = {
  all: ['complaints'] as const,
  lists: () => [...complaintKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...complaintKeys.lists(), filters] as const,
  details: () => [...complaintKeys.all, 'detail'] as const,
  detail: (id: string) => [...complaintKeys.details(), id] as const,
  my: () => [...complaintKeys.all, 'my'] as const,
  archived: () => [...complaintKeys.all, 'archived'] as const,
  stats: () => [...complaintKeys.all, 'stats'] as const,
};

// API functions
const complaintApi = {
  // Get all complaints (admin/agent/manager)
  getComplaints: async (params?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    return apiClient.get<{
      message: string;
      complaints: Complaint[];
      pagination: { total: number; page: number; limit: number; pages: number };
    }>(`/admin/complaints${queryString ? `?${queryString}` : ''}`);
  },

  // Get my complaints (citizen)
  getMyComplaints: async (params?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    return apiClient.get<{
      message: string;
      complaints: Complaint[];
      pagination: { total: number; page: number; limit: number; pages: number };
    }>(`/citizen/complaints${queryString ? `?${queryString}` : ''}`);
  },

  // Get single complaint
  getComplaint: async (id: string) => {
    return apiClient.get<{ message: string; complaint: Complaint }>(`/complaints/${id}`);
  },

  // Get archived complaints (admin)
  getArchivedComplaints: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    return apiClient.get<{
      message: string;
      complaints: Complaint[];
      pagination: { total: number; page: number; limit: number; pages: number };
    }>(`/complaints/archived${queryString ? `?${queryString}` : ''}`);
  },

  // Get dashboard stats
  getStats: async () => {
    return apiClient.get<{
      message: string;
      stats: {
        total: number;
        pending: number;
        inProgress: number;
        resolved: number;
        closed: number;
      };
    }>('/admin/stats');
  },

  // Create complaint
  createComplaint: async (data: CreateComplaintData) => {
    return apiClient.post<{ message: string; complaint: Complaint }>('/citizen/complaints', data);
  },

  // Update complaint status (agent/manager)
  updateStatus: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
    return apiClient.put<{ message: string; complaint: Complaint }>(`/agent/complaints/${id}/status`, {
      status,
      notes,
    });
  },

  // Assign complaint (manager)
  assignComplaint: async ({ id, departmentId, technicianId }: { id: string; departmentId?: string; technicianId?: string }) => {
    return apiClient.put<{ message: string; complaint: Complaint }>(`/manager/complaints/${id}/assign`, {
      departmentId,
      technicianId,
    });
  },

  // Archive complaint (admin)
  archiveComplaint: async (id: string) => {
    return apiClient.put<{ message: string }>(`/admin/complaints/${id}/archive`);
  },

  // Unarchive complaint (admin)
  unarchiveComplaint: async (id: string) => {
    return apiClient.put<{ message: string }>(`/admin/complaints/${id}/unarchive`);
  },

  // Delete complaint
  deleteComplaint: async (id: string) => {
    return apiClient.delete<{ message: string }>(`/complaints/${id}`);
  },
};

// Hooks

// Get all complaints (admin view)
export function useComplaints(params?: {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: complaintKeys.list(params || {}),
    queryFn: () => complaintApi.getComplaints(params),
  });
}

// Get my complaints (citizen view)
export function useMyComplaints(params?: {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: complaintKeys.my(),
    queryFn: () => complaintApi.getMyComplaints(params),
  });
}

// Get single complaint
export function useComplaint(id: string) {
  return useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: () => complaintApi.getComplaint(id),
    enabled: !!id,
  });
}

// Get archived complaints
export function useArchivedComplaints(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: complaintKeys.archived(),
    queryFn: () => complaintApi.getArchivedComplaints(params),
  });
}

// Get dashboard stats
export function useStats() {
  return useQuery({
    queryKey: complaintKeys.stats(),
    queryFn: () => complaintApi.getStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Create complaint mutation
export function useCreateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateComplaintData) => complaintApi.createComplaint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.all });
    },
  });
}

// Update complaint status mutation
export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      complaintApi.updateStatus({ id, status, notes }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.all });
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
    },
  });
}

// Assign complaint mutation
export function useAssignComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, departmentId, technicianId }: { id: string; departmentId?: string; technicianId?: string }) =>
      complaintApi.assignComplaint({ id, departmentId, technicianId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.all });
      queryClient.invalidateQueries({ queryKey: complaintKeys.detail(variables.id) });
    },
  });
}

// Archive complaint mutation
export function useArchiveComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => complaintApi.archiveComplaint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.all });
    },
  });
}

// Unarchive complaint mutation
export function useUnarchiveComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => complaintApi.unarchiveComplaint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.archived() });
    },
  });
}

// Delete complaint mutation
export function useDeleteComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => complaintApi.deleteComplaint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.all });
    },
  });
}
