import { apiClient } from './api.client';

interface SatisfactionSurvey {
  _id: string;
  complaint: string;
  citizen: string;
  rating?: number;
  comment?: string;
  shownAt: string;
  respondedAt?: string;
  dismissed: boolean;
  dismissedAt?: string;
  nextEligibleDate?: string;
}

interface SurveyStats {
  totalRatings: number;
  averageRating: number;
  rating5: number;
  rating4: number;
  rating3: number;
  rating2: number;
  rating1: number;
}

export const satisfactionService = {
  async createSurvey(complaintId: string, rating: number, comment?: string) {
    return apiClient.post<{ success: boolean; message?: string }>(
      '/satisfaction',
      {
        complaintId,
        rating,
        comment,
      }
    );
  },

  async dismissSurvey(complaintId: string) {
    return apiClient.post<{ success: boolean; message?: string }>(
      '/satisfaction/dismiss',
      {
        complaintId,
      }
    );
  },

  async getPendingSurvey() {
    return apiClient.get<{ success: boolean; data: SatisfactionSurvey | null }>(
      '/satisfaction/pending'
    );
  },

  async triggerSurveyForComplaint(complaintId: string) {
    return apiClient.post<{ success: boolean; message?: string }>(
      `/satisfaction/trigger/${complaintId}`
    );
  },

  async getSurveyStats() {
    return apiClient.get<{ success: boolean; data: SurveyStats }>(
      '/satisfaction/stats'
    );
  },
};
