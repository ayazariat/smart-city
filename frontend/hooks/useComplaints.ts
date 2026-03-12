/**
 * Role-based Complaints Hook
 * 
 * Provides complaint fetching based on user role:
 * - CITIZEN → /citizen/complaints (own only)
 * - AGENT → /agent/complaints (municipality)
 * - MANAGER → /manager/complaints (dept + municipality)
 * - TECHNICIAN → /technician/tasks (assigned only)
 * - ADMIN → /complaints (all)
 */

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { clientGet, clientPost, clientPut, clientDelete } from "@/lib/api";
import { Complaint, CreateComplaintData } from "@/types";

// User role types
type UserRole = "CITIZEN" | "MUNICIPAL_AGENT" | "DEPARTMENT_MANAGER" | "TECHNICIAN" | "ADMIN";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ComplaintsFilters {
  status?: string;
  category?: string;
  search?: string;
  urgency?: string;
  page?: number;
  limit?: number;
}

interface UseComplaintsOptions {
  autoFetch?: boolean;
}

/**
 * Get the appropriate API endpoint based on user role
 */
function getEndpointByRole(role: UserRole | undefined): string {
  switch (role) {
    case "CITIZEN":
      return "/citizen/complaints";
    case "MUNICIPAL_AGENT":
      return "/agent/complaints";
    case "DEPARTMENT_MANAGER":
      return "/manager/complaints";
    case "TECHNICIAN":
      return "/technician/tasks";
    case "ADMIN":
      return "/complaints";
    default:
      return "/citizen/complaints";
  }
}

/**
 * Hook for fetching complaints based on user role
 */
export function useComplaints(options: UseComplaintsOptions = {}) {
  const { autoFetch = true } = options;
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const role = user?.role as UserRole | undefined;

  const fetchComplaints = useCallback(async (filters: ComplaintsFilters = {}) => {
    if (!role) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = getEndpointByRole(role);
      const params = new URLSearchParams();
      
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.status) params.append("status", filters.status);
      if (filters.category) params.append("category", filters.category);
      if (filters.urgency) params.append("urgency", filters.urgency);
      if (filters.search) params.append("search", filters.search);

      const queryString = params.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;

      const response = await clientGet<PaginatedResponse<Complaint>>(url);

      setComplaints(response.data || []);
      setPagination({
        page: response.page || 1,
        limit: response.limit || 10,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  }, [role]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && role) {
      fetchComplaints();
    }
  }, [autoFetch, role, fetchComplaints]);

  // Create complaint (citizen only)
  const createComplaint = async (data: CreateComplaintData): Promise<Complaint> => {
    const response = await clientPost<Complaint>("/citizen/complaints", data);
    await fetchComplaints(); // Refresh list
    return response;
  };

  // Update complaint (citizen - before validation)
  const updateComplaint = async (id: string, data: Partial<CreateComplaintData>): Promise<Complaint> => {
    const response = await clientPut<Complaint>(`/citizen/complaints/${id}`, data);
    await fetchComplaints(); // Refresh list
    return response;
  };

  // Delete complaint (citizen - before validation)
  const deleteComplaint = async (id: string): Promise<void> => {
    await clientDelete(`/citizen/complaints/${id}`);
    await fetchComplaints(); // Refresh list
  };

  // Confirm complaint (Me Too +3 score)
  const confirmComplaint = async (id: string): Promise<void> => {
    await clientPost(`/complaints/${id}/confirm`);
    await fetchComplaints(); // Refresh list
  };

  // Search complaints (debounced 400ms)
  const searchComplaints = useCallback(
    (query: string) => {
      const timeoutId = setTimeout(() => {
        fetchComplaints({ search: query });
      }, 400);
      return () => clearTimeout(timeoutId);
    },
    [fetchComplaints]
  );

  return {
    complaints,
    loading,
    error,
    pagination,
    fetchComplaints,
    createComplaint,
    updateComplaint,
    deleteComplaint,
    confirmComplaint,
    searchComplaints,
    role,
  };
}

/**
 * Hook for fetching a single complaint detail
 */
export function useComplaintDetail(complaintId: string | null) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!complaintId) return;

    const fetchComplaint = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await clientGet<Complaint>(`/complaints/${complaintId}`);
        setComplaint(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch complaint");
      } finally {
        setLoading(false);
      }
    };

    fetchComplaint();
  }, [complaintId]);

  return { complaint, loading, error };
}

/**
 * Hook for complaint internal notes
 */
export function useComplaintNotes(complaintId: string | null) {
  const [notes, setNotes] = useState<Array<{
    _id: string;
    content: string;
    type: "NOTE" | "BLOCAGE";
    author: { _id: string; fullName: string };
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!complaintId) return;

    try {
      const response = await clientGet<typeof notes>(`/complaints/${complaintId}/notes`);
      setNotes(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch notes");
    }
  }, [complaintId]);

  // Fetch notes every 30 seconds
  useEffect(() => {
    if (!complaintId) return;

    fetchNotes();
    const interval = setInterval(fetchNotes, 30000);

    return () => clearInterval(interval);
  }, [complaintId, fetchNotes]);

  // Add note
  const addNote = async (content: string, type: "NOTE" | "BLOCAGE" = "NOTE") => {
    if (!complaintId) return;

    await clientPost(`/complaints/${complaintId}/notes`, { content, type });
    await fetchNotes();
  };

  return { notes, loading, error, addNote, refetch: fetchNotes };
}

/**
 * Hook for archived complaints (admin only)
 */
export function useArchivedComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchArchived = async (filters: ComplaintsFilters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);

      const queryString = params.toString();
      const url = `/complaints/archived${queryString ? `?${queryString}` : ""}`;

      const response = await clientGet<PaginatedResponse<Complaint>>(url);

      setComplaints(response.data || []);
      setPagination({
        page: response.page || 1,
        limit: response.limit || 10,
        total: response.total || 0,
        totalPages: response.totalPages || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch archived complaints");
    } finally {
      setLoading(false);
    }
  };

  // Unarchive complaint (admin)
  const unarchiveComplaint = async (id: string): Promise<void> => {
    await clientPut(`/admin/complaints/${id}/unarchive`);
    await fetchArchived();
  };

  return {
    complaints,
    loading,
    error,
    pagination,
    fetchArchived,
    unarchiveComplaint,
  };
}

/**
 * Hook for complaint statistics
 */
export function useComplaintStats() {
  const [stats, setStats] = useState<{
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    monthly: Array<{ month: string; count: number }>;
    sla: { overdue: number; atRisk: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statusResponse, categoryResponse, monthlyResponse, slaResponse] = await Promise.all([
        clientGet<Record<string, number>>("/stats/complaints"),
        clientGet<Record<string, number>>("/stats/complaints?by=category"),
        clientGet<Array<{ month: string; count: number }>>("/stats/monthly"),
        clientGet<{ overdue: number; atRisk: number }>("/stats/sla"),
      ]);

      setStats({
        byStatus: statusResponse,
        byCategory: categoryResponse,
        monthly: monthlyResponse,
        sla: slaResponse,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role && ["ADMIN", "DEPARTMENT_MANAGER", "MUNICIPAL_AGENT", "TECHNICIAN"].includes(role)) {
      fetchStats();
    }
  }, [role, fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
