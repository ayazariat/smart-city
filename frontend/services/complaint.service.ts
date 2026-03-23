import { Complaint, CreateComplaintData, ComplaintCategory, ComplaintUrgency, ComplaintLocation, ComplaintMedia, Comment } from "@/types";
import { apiClient } from "./api.client";
import { useAuthStore } from "@/store/useAuthStore";

// Cloudinary base URL for media files - used for prepending to relative paths
// This should be configured in your .env.local
// Example: NEXT_PUBLIC_CLOUDINARY_BASE_URL=https://res.cloudinary.com/your-cloud-name/image/upload
const getCloudinaryBaseUrl = (): string => {
  // Try environment variable first
  const envUrl = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL;
  if (envUrl) return envUrl;
  
  // Default - will be replaced with actual uploaded URL
  return "";
};

/**
 * Helper function to get full Cloudinary URL
 * If the URL is already a full URL (starts with http), return as-is
 * Otherwise, check if it's a Cloudinary public ID and construct the URL
 */
export function getFullMediaUrl(url: string | undefined): string {
  if (!url) return "";
  
  // If already a full URL, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  // If it's a relative path (starts with /), return as-is
  // The backend should return full URLs after upload
  if (url.startsWith("/")) {
    // Could prepend API base URL if needed
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return `${apiUrl}${url}`;
  }
  
  // If it's a Cloudinary public ID (no slashes), construct URL
  // This assumes the backend stores just the public ID
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${url}`;
}

/**
 * Process complaint data to fix media URLs
 * This ensures all media URLs are full URLs
 */
export function processComplaintMedia(complaint: Complaint): Complaint {
  if (!complaint) return complaint;
  
  // Process media array
  if (complaint.media) {
    complaint.media = complaint.media.map(item => ({
      ...item,
      url: getFullMediaUrl(item.url)
    }));
  }
  
  // Process before photos
  if (complaint.beforePhotos) {
    complaint.beforePhotos = complaint.beforePhotos.map(photo => ({
      ...photo,
      url: getFullMediaUrl(photo.url)
    }));
  }
  
  // Process after photos
  if (complaint.afterPhotos) {
    complaint.afterPhotos = complaint.afterPhotos.map(photo => ({
      ...photo,
      url: getFullMediaUrl(photo.url)
    }));
  }
  
  return complaint;
}

/**
  * Upload media files to Cloudinary
  */
export const uploadMedia = async (
  files: File[]
): Promise<{ success: boolean; data?: ComplaintMedia[]; message?: string }> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('media', file);
  });

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    
    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Upload failed:', result.message);
      return { success: false, message: result.message || 'Upload failed' };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, message: 'Failed to upload files' };
  }
};

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

  console.log("Fetching from endpoint:", endpoint);
  const result = await apiClient.get<{
    message: string;
    complaints: Complaint[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  }>(endpoint);
  console.log("API response:", result);
  return result;
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
 * Update citizen's own complaint (only if SUBMITTED status)
 */
export const updateComplaint = async (
  id: string,
  data: Partial<{
    title: string;
    description: string;
    category: ComplaintCategory;
    urgency: ComplaintUrgency;
    location: ComplaintLocation;
    media: ComplaintMedia[];
  }>
): Promise<{ message: string; complaint: Complaint }> => {
  return apiClient.put<{ message: string; complaint: Complaint }>(`/citizen/complaints/${id}`, data);
};

/**
 * Delete citizen's own complaint (only if SUBMITTED status)
 */
export const deleteComplaint = async (
  id: string
): Promise<{ message: string }> => {
  return apiClient.delete<{ message: string }>(`/citizen/complaints/${id}`);
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
  includeArchived?: boolean;
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
  if (params?.includeArchived) searchParams.set("includeArchived", "true");

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

/**
 * Add a comment/note to a complaint
 * isInternal: true for internal notes (staff only)
 */
export const addComplaintComment = async (
  id: string,
  text: string,
  isInternal: boolean = false
): Promise<{ success: boolean; data: Comment; message?: string }> => {
  return apiClient.post<{ success: boolean; data: Comment; message?: string }>(
    `/complaints/${id}/comments`,
    { text, isInternal }
  );
};

/**
 * Citizen confirms resolution (changes RESOLVED to CLOSED)
 */
export const confirmResolution = async (
  id: string
): Promise<{ success: boolean; data: Complaint; message?: string }> => {
  return apiClient.patch<{ success: boolean; data: Complaint; message?: string }>(
    `/complaints/${id}/status`,
    { status: "CLOSED" }
  );
};

/**
 * Archive a complaint (admin only)
 */
export const archiveComplaint = async (
  id: string
): Promise<{ success: boolean; data: Complaint; message?: string }> => {
  return apiClient.patch<{ success: boolean; data: Complaint; message?: string }>(
    `/complaints/${id}/archive`,
    {}
  );
};

/**
 * Unarchive a complaint (admin only)
 */
export const unarchiveComplaint = async (
  id: string
): Promise<{ success: boolean; data: Complaint; message?: string }> => {
  return apiClient.patch<{ success: boolean; data: Complaint; message?: string }>(
    `/complaints/${id}/unarchive`,
    {}
  );
};

/**
 * Get archived complaints (admin view)
 */
export const getArchivedComplaints = async (params?: {
  filter?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  complaints: Complaint[];
  total: number;
  page: number;
  pages: number;
}> => {
  const searchParams = new URLSearchParams();
  if (params?.filter) searchParams.set('filter', params.filter);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/complaints/archived${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<{
    success: boolean;
    complaints: Complaint[];
    total: number;
    page: number;
    pages: number;
  }>(endpoint);
};

/**
 * Predict category using AI
 */
export const predictCategory = async (text: string): Promise<{
  predicted: string;
  confidence: number;
  alternatives: string[];
  reasoning: string;
}> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  
  const response = await fetch(`${apiUrl}/api/ai/predict-category`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    return {
      predicted: "AUTRE",
      confidence: 0,
      alternatives: [],
      reasoning: "AI service unavailable",
    };
  }

  return response.json();
};

/**
 * Extract keywords using AI
 */
export const extractKeywords = async (text: string): Promise<{
  keywords: string[];
  locationKeywords: string[];
  urgencyKeywords: string[];
  similarityHash: string;
}> => {
  const aiUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";
  
  const response = await fetch(`${aiUrl}/ai/extract-keywords`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    return {
      keywords: [],
      locationKeywords: [],
      urgencyKeywords: [],
      similarityHash: "",
    };
  }

  return response.json();
};

/**
 * Confirm a complaint (citizen BL-28)
 * Returns updated confirmation count
 */
export const confirmComplaint = async (
  id: string
): Promise<{ success: boolean; confirmationCount: number; message: string }> => {
  return apiClient.post<{ success: boolean; confirmationCount: number; message: string }>(
    `/complaints/${id}/confirm`,
    {}
  );
};

/**
 * Remove confirmation from a complaint (citizen BL-28)
 * Only allowed within 24 hours
 */
export const unconfirmComplaint = async (
  id: string
): Promise<{ success: boolean; confirmationCount: number; message: string }> => {
  return apiClient.delete<{ success: boolean; confirmationCount: number; message: string }>(
    `/complaints/${id}/confirm`
  );
};

/**
 * Upvote a complaint (citizen BL-28)
 * Returns updated upvote count
 */
export const upvoteComplaint = async (
  id: string
): Promise<{ success: boolean; upvoteCount: number; message: string }> => {
  return apiClient.post<{ success: boolean; upvoteCount: number; message: string }>(
    `/complaints/${id}/upvote`,
    {}
  );
};

/**
 * Remove upvote from a complaint (citizen BL-28)
 * Only allowed within 24 hours
 */
export const removeUpvote = async (
  id: string
): Promise<{ success: boolean; upvoteCount: number; message: string }> => {
  return apiClient.delete<{ success: boolean; upvoteCount: number; message: string }>(
    `/complaints/${id}/upvote`
  );
};

export const complaintService = {
  submitComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getComplaintDetail,
  getAllComplaints,
  updateComplaintStatus,
  assignComplaint,
  updateComplaintDepartment,
  updateComplaintPriority,
  addComplaintComment,
  confirmResolution,
  archiveComplaint,
  unarchiveComplaint,
  getArchivedComplaints,
  getFullMediaUrl,
  processComplaintMedia,
  predictCategory,
  extractKeywords,
  confirmComplaint,
  unconfirmComplaint,
  upvoteComplaint,
  removeUpvote,
};
