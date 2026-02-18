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
 * Get a single complaint by ID
 */
export const getComplaintById = async (
  id: string
): Promise<{ message: string; complaint: Complaint }> => {
  return apiClient.get<{ message: string; complaint: Complaint }>(`/citizen/complaints/${id}`);
};

export const complaintService = {
  submitComplaint,
  getMyComplaints,
  getComplaintById,
};
