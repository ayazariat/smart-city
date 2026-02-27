import { Complaint, CreateComplaintData } from "@/types";
import { apiClient } from "./api.client";

/**
 * Submit a new complaint (authenticated citizen)
 */
export const submitComplaint = async (
  data: CreateComplaintData
): Promise<{ message: string; complaint: Complaint }> => {
  // apiClient gère déjà le token (useAuthStore) + refresh
  return apiClient.post<{ message: string; complaint: Complaint }>("/citizen/complaints", data);
};

/**
 * Get citizen's complaints (with optional filters)
 */
export const getMyComplaints = async (params?: {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}): Promise<{
  message: string;
  complaints: Complaint[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}> => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/citizen/complaints${queryString ? `?${queryString}` : ""}`;

  return apiClient.get<{
    message: string;
    complaints: Complaint[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }>(endpoint);
};

/**
 * Get a single complaint by ID (citizen view)
 */
export const getComplaintById = async (
  id: string
): Promise<{ message: string; complaint: Complaint }> => {
  return apiClient.get<{ message: string; complaint: Complaint }>(`/citizen/complaints/${id}`);
};

/**
 * Get complaint detail for agent/manager (BL-16)
 * Returns full complaint details including media, location, and reporter info
 */
export const getComplaintDetail = async (
  id: string
): Promise<{ success: boolean; data: Complaint }> => {
  return apiClient.get<{ success: boolean; data: Complaint }>(`/complaints/${id}`);
};

/**
 * Get all complaints (admin/agent view)
 */
export const getAllComplaints = async (params?: {
  status?: string;
  category?: string;
  governorate?: string;
  municipality?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
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
  if (params?.governorate) searchParams.set("governorate", params.governorate);
  if (params?.municipality) searchParams.set("municipality", params.municipality);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/complaints${queryString ? `?${queryString}` : ""}`;

  return apiClient.get<{
    success: boolean;
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
 * Update complaint status (validate, reject, etc.)
 */
export const updateComplaintStatus = async (
  id: string,
  status: string,
  rejectionReason?: string
): Promise<{ success: boolean; data: Complaint; message?: string }> => {
  return apiClient.patch<{ success: boolean; data: Complaint; message?: string }>(
    `/complaints/${id}/status`,
    { status, rejectionReason }
  );
};

/**
 * Assign complaint to a technician
 */
export const assignComplaint = async (
  id: string,
  assignedToId: string
): Promise<{ success: boolean; data: Complaint; message?: string }> => {
  return apiClient.patch<{ success: boolean; data: Complaint; message?: string }>(
    `/complaints/${id}/assign`,
    { assignedToId }
  );
};

/**
 * Assign complaint to a department
 */
export const updateComplaintDepartment = async (
  id: string,
  departmentId: string
): Promise<{ success: boolean; data: Complaint; message?: string }> => {
  return apiClient.patch<{ success: boolean; data: Complaint; message?: string }>(
    `/complaints/${id}/department`,
    { departmentId }
  );
};

/**
 * Update complaint priority/urgency
 */
export const updateComplaintPriority = async (
  id: string,
  urgency: string,
  priorityScore?: number
): Promise<{ success: boolean; data: Complaint; message?: string }> => {
  return apiClient.patch<{ success: boolean; data: Complaint; message?: string }>(
    `/complaints/${id}/priority`,
    { urgency, priorityScore }
  );
};

export const complaintService = {
  submitComplaint,
  getMyComplaints,
  getComplaintById,
  getComplaintDetail,
  getAllComplaints,
  updateComplaintStatus,
  assignComplaint,
  updateComplaintDepartment,
  updateComplaintPriority,
};
