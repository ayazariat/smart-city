/**
 * Technician Service
 * 
 * Handles technician-specific operations:
 * - GET /technician/complaints (assigned complaints)
 * - PUT /technician/complaints/:id/start
 * - PUT /technician/complaints/:id/complete
 * - POST /technician/complaints/:id/comments
 * - PUT /technician/complaints/:id/location (GPS tracking)
 */

import { apiClient } from "./api.client";
import { Complaint } from "@/types";

// Task status types
export type TaskStatus = "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

// Task response type
interface TasksResponse {
  success: boolean;
  data: {
    tasks?: Complaint[];
    complaints?: Complaint[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

interface TaskDetailResponse {
  success: boolean;
  data: Complaint;
}

interface StatusUpdateResponse {
  success: boolean;
  message: string;
  data: Complaint;
}

interface CommentResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    text: string;
    type: "NOTE" | "BLOCAGE";
    author: { _id: string; fullName: string };
    createdAt: string;
  };
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: string;
}

/**
 * Get technician's assigned tasks/complaints
 */
export async function getTechnicianTasks(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<TasksResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const queryString = searchParams.toString();
  const endpoint = `/technician/complaints${queryString ? `?${queryString}` : ""}`;

  return apiClient.get<TasksResponse>(endpoint);
}

/**
 * Get single task detail
 */
export async function getTaskDetail(taskId: string): Promise<TaskDetailResponse> {
  return apiClient.get<TaskDetailResponse>(`/technician/complaints/${taskId}`);
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  notes?: string
): Promise<StatusUpdateResponse> {
  // Use the correct endpoints based on status
  if (status === "IN_PROGRESS") {
    return apiClient.put<StatusUpdateResponse>(`/technician/complaints/${taskId}/start`, {
      notes,
    });
  }
  if (status === "RESOLVED") {
    return apiClient.put<StatusUpdateResponse>(`/technician/complaints/${taskId}/complete`, {
      notes,
    });
  }
  return apiClient.put<StatusUpdateResponse>(`/technician/complaints/${taskId}/status`, {
    status,
    notes,
  });
}

/**
 * Start work on a task
 */
export async function startWork(taskId: string): Promise<StatusUpdateResponse> {
  return apiClient.put<StatusUpdateResponse>(`/technician/complaints/${taskId}/start`, {});
}

/**
 * Resolve a task with proof photos
 */
export async function resolveTask(
  taskId: string,
  resolutionNotes: string,
  proofPhotos?: string[]
): Promise<StatusUpdateResponse> {
  return apiClient.put<StatusUpdateResponse>(`/technician/complaints/${taskId}/complete`, {
    notes: resolutionNotes,
    afterPhotos: proofPhotos?.map(url => ({ type: "photo", url })),
  });
}

/**
 * Add a comment/note to a task
 * type: NOTE for regular notes, BLOCAGE for blockage issues
 */
export async function addTaskComment(
  taskId: string,
  content: string,
  type: "NOTE" | "BLOCAGE" = "NOTE"
): Promise<CommentResponse> {
  return apiClient.post<CommentResponse>(`/technician/complaints/${taskId}/comments`, {
    content,
    type,
  });
}

/**
 * Report a blocker/issue with a task
 */
export async function reportBlocker(
  taskId: string,
  reason: string
): Promise<CommentResponse> {
  return addTaskComment(taskId, reason, "BLOCAGE");
}

/**
 * Update technician's current location (GPS tracking)
 */
export async function updateLocation(
  taskId: string,
  location: LocationUpdate
): Promise<{ success: boolean; message: string }> {
  return apiClient.put<{ success: boolean; message: string }>(
    `/technician/complaints/${taskId}/location`,
    location
  );
}

/**
 * Start GPS tracking for a task
 * Returns a function to stop tracking
 */
export function startLocationTracking(
  taskId: string,
  onLocationUpdate?: (location: LocationUpdate) => void
): () => void {
  let watchId: number | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  const startTracking = () => {
    if (!navigator.geolocation) {
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        updateLocation(taskId, location);
        onLocationUpdate?.(location);
      },
      (error) => {
      },
      { enableHighAccuracy: true }
    );

    // Watch position and send updates every 30 seconds
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        updateLocation(taskId, location);
        onLocationUpdate?.(location);
      },
      (error) => {
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );

    // Send location every 30 seconds regardless of position change
    intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationUpdate = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
          };

          updateLocation(taskId, location);
          onLocationUpdate?.(location);
        },
        (error) => {
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }, 30000);
  };

  // Start tracking
  startTracking();

  // Return cleanup function
  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  };
}

/**
 * Get technician statistics
 */
export async function getTechnicianStats(): Promise<{
  success: boolean;
  data: {
    total: number;
    assigned: number;
    inProgress: number;
    resolved: number;
    blocked: number;
  };
}> {
  return apiClient.get<{
    success: boolean;
    data: {
      total: number;
      assigned: number;
      inProgress: number;
      resolved: number;
      blocked: number;
    };
  }>("/technician/stats");
}

// Export as service object
export const technicianService = {
  getTechnicianTasks,
  getTaskDetail,
  updateTaskStatus,
  startWork,
  resolveTask,
  addTaskComment,
  reportBlocker,
  updateLocation,
  startLocationTracking,
  getTechnicianStats,
};
