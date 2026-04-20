import { apiClient } from "./api.client";

export interface HeatmapPoint {
  lat: number;
  lng: number;
  count: number;
  categories: string[];
}

export interface HeatmapResponse {
  success: boolean;
  data: HeatmapPoint[];
  total: number;
  points: number;
}

export const heatmapService = {
  getHeatmapData: async (params: {
    category?: string;
    status?: string;
    municipality?: string;
    department?: string;
  }): Promise<HeatmapResponse> => {
    const queryParams = new URLSearchParams();
    
    if (params.category) queryParams.append('category', params.category);
    if (params.status) queryParams.append('status', params.status);
    if (params.municipality) queryParams.append('municipality', params.municipality);
    if (params.department) queryParams.append('department', params.department);
    
    const response = await apiClient.get<HeatmapResponse>(`/heatmap?${queryParams.toString()}`);
    return response;
  },
  
  getCategories: async (): Promise<{ success: boolean; categories: string[] }> => {
    const response = await apiClient.get<{ success: boolean; categories: string[] }>('/heatmap/categories');
    return response;
  }
};
