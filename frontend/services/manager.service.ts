import { apiClient } from "./api.client";

// Define response types
interface ManagerComplaintsResponse {
  success: boolean;
  message?: string;
  data: {
    complaints: Array<{
      _id: string;
      id?: string;
      description: string;
      category: string;
      status: string;
      priorityScore?: number;
      urgency?: string;
      location?: { address?: string };
      createdAt: string;
      createdBy?: { fullName: string };
      citizen?: { fullName: string };
      assignedTo?: { _id: string; fullName: string };
      assignedDepartment?: { _id: string; name: string };
      media?: Array<{ url: string; type: string }>;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    departmentName?: string;
  };
}

interface Technician {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
}

interface ManagerStatsResponse {
  success: boolean;
  data: {
    total: number;
    assigned: number;
    inProgress: number;
    resolved: number;
  };
}

interface AssignResponse {
  success: boolean;
  message: string;
  data: Record<string, unknown>;
}

export const managerService = {
  /**
   * Get complaints for manager's department
   */
  async getManagerComplaints(params: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.category) queryParams.append("category", params.category);
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());

    return apiClient.get<ManagerComplaintsResponse>(`/manager/complaints?${queryParams.toString()}`);
  },

  /**
   * Assign complaint to a technician
   */
  async assignTechnician(complaintId: string, technicianId: string) {
    return apiClient.put<AssignResponse>(`/manager/complaints/${complaintId}/assign-technician`, {
      technicianId,
    });
  },

  /**
   * Reassign technician (only when ASSIGNED status)
   */
  async reassignTechnician(complaintId: string, technicianId: string) {
    return apiClient.put<AssignResponse>(`/manager/complaints/${complaintId}/reassign-technician`, {
      technicianId,
    });
  },

  /**
   * Assign multiple technicians and create a repair team
   */
  async assignTeam(complaintId: string, technicianIds: string[]) {
    return apiClient.put<AssignResponse>(`/manager/complaints/${complaintId}/assign-team`, {
      technicianIds,
    });
  },

  /**
   * Update complaint priority
   */
  async updatePriority(
    complaintId: string,
    data: { urgency?: string; priorityScore?: number }
  ) {
    return apiClient.put<AssignResponse>(`/manager/complaints/${complaintId}/priority`, data);
  },

  /**
   * Get technicians in manager's department
   */
  async getTechnicians() {
    return apiClient.get<{ success: boolean; data: Technician[] }>("/manager/technicians");
  },

  /**
   * Get department statistics
   */
  async getStats() {
    return apiClient.get<ManagerStatsResponse>("/manager/stats");
  },

  /**
   * Validate a submitted complaint (Manager only)
   */
  async validateComplaint(complaintId: string) {
    return apiClient.put<AssignResponse>(`/manager/complaints/${complaintId}/validate`, {});
  },

  /**
   * Reject a submitted complaint (Manager only)
   */
  async rejectComplaint(complaintId: string, reason: string) {
    return apiClient.put<AssignResponse>(`/manager/complaints/${complaintId}/reject`, { reason });
  },
};
