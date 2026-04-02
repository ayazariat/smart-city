import { Complaint } from "@/types";
import { apiClient } from "./api.client";

/**
 * Get agent's complaints (filtered by municipality)
 */
export const getAgentComplaints = async (params?: {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    complaints: Complaint[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    municipalityName?: string;
  };
}> => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/agent/complaints${queryString ? `?${queryString}` : ""}`;

  return apiClient.get<{
    success: boolean;
    message: string;
    data: {
      complaints: Complaint[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
      };
    };
  }>(endpoint);
};

/**
 * Validate a submitted complaint
 */
export const validateComplaint = async (
  id: string
): Promise<{ success: boolean; message: string; data: Complaint }> => {
  return apiClient.put<{ success: boolean; message: string; data: Complaint }>(
    `/agent/complaints/${id}/validate`,
    {}
  );
};

/**
 * Reject a submitted complaint with justification
 */
export const rejectComplaint = async (
  id: string,
  reason: string
): Promise<{ success: boolean; message: string; data: Complaint }> => {
  return apiClient.put<{ success: boolean; message: string; data: Complaint }>(
    `/agent/complaints/${id}/reject`,
    { reason }
  );
};

/**
 * Close a resolved complaint
 */
export const closeComplaint = async (
  id: string
): Promise<{ success: boolean; message: string; data: Complaint }> => {
  return apiClient.put<{ success: boolean; message: string; data: Complaint }>(
    `/agent/complaints/${id}/close`,
    {}
  );
};

/**
 * Get available departments
 */
export const getAgentDepartments = async (): Promise<{
  success: boolean;
  data: Array<{ _id: string; name: string; email?: string; phone?: string }>;
}> => {
  return apiClient.get<{
    success: boolean;
    data: Array<{ _id: string; name: string; email?: string; phone?: string }>;
  }>("/agent/departments");
};

/**
 * Assign complaint to department
 */
export const assignComplaintToDepartment = async (
  complaintId: string,
  departmentId: string
): Promise<{ success: boolean; message: string; data: Complaint }> => {
  return apiClient.put<{ success: boolean; message: string; data: Complaint }>(
    `/agent/complaints/${complaintId}/assign-department`,
    { departmentId }
  );
};

/**
 * Get agent statistics
 */
export const getAgentStats = async (): Promise<{
  success: boolean;
  data: {
    total: number;
    submitted: number;
    validated: number;
    assigned: number;
    inProgress: number;
    resolved: number;
    closed: number;
    rejected: number;
    totalOverdue: number;
    totalAtRisk: number;
    resolutionRate: number;
    averageResolutionTime: number;
    byCategory: Record<string, number>;
    byMonth: Record<string, number>;
  };
}> => {
  return apiClient.get("/complaints/stats");
};

/**
 * Approve technician resolution report
 */
export const approveResolution = async (
  complaintId: string
): Promise<{ success: boolean; message: string; data: Complaint }> => {
  return apiClient.post<{ success: boolean; message: string; data: Complaint }>(
    `/agent/complaints/${complaintId}/approve-resolution`,
    {}
  );
};

/**
 * Reject technician resolution report
 */
export const rejectResolution = async (
  complaintId: string,
  rejectionReason: string
): Promise<{ success: boolean; message: string; data: Complaint }> => {
  return apiClient.post<{ success: boolean; message: string; data: Complaint }>(
    `/agent/complaints/${complaintId}/reject-resolution`,
    { rejectionReason }
  );
};

export const agentService = {
  getAgentComplaints,
  validateComplaint,
  rejectComplaint,
  closeComplaint,
  getAgentDepartments,
  assignComplaintToDepartment,
  getStats: getAgentStats,
  approveResolution,
  rejectResolution,
};

// AI Department Prediction
export const predictDepartment = async (category: string, description: string, municipality?: string): Promise<{
  success: boolean;
  data?: {
    suggestedDepartment: string;
    departmentName: string;
    confidence: number;
    message: string;
  };
}> => {
  return apiClient.post("/public/ai/predict-department", { category, description, municipality });
};
