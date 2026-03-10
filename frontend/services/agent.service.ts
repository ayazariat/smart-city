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
  };
}> => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/agent/complaints${queryString ? `?${queryString}` : "?status=ALL"}`;

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
 * Assign complaint to a department
 */
export const assignComplaintToDepartment = async (
  id: string,
  departmentId: string
): Promise<{ success: boolean; message: string; data: Complaint }> => {
  return apiClient.put<{ success: boolean; message: string; data: Complaint }>(
    `/agent/complaints/${id}/assign`,
    { departmentId }
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

export const agentService = {
  getAgentComplaints,
  validateComplaint,
  rejectComplaint,
  assignComplaintToDepartment,
  getAgentDepartments,
};
