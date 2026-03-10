import axios from 'axios';

const AI_URL = process.env.NEXT_PUBLIC_AI_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: AI_URL,
  timeout: 15000,
});

export interface CategoryPrediction {
  predicted: string;
  confidence: number;
  alternatives: string[];
  reasoning: string;
}

export interface KeywordExtraction {
  keywords: string[];
  locationKeywords: string[];
  urgencyKeywords: string[];
  similarityHash: string;
}

export interface SLACalculation {
  deadline: string;
  status: 'ON_TRACK' | 'AT_RISK' | 'OVERDUE';
  remaining_hours: number;
  total_hours: number;
}

export const aiService = {
  /**
   * Predict category based on title and description
   * Called from report form with debounce (1500ms after title>12 + desc>20 chars)
   */
  predictCategory: async (title: string, description: string): Promise<CategoryPrediction> => {
    try {
      const response = await aiClient.post<CategoryPrediction>('/ai/predict-category', {
        title,
        description,
      });
      return response.data;
    } catch (error) {
      console.error('AI category prediction error:', error);
      // Return fallback
      return {
        predicted: 'AUTRE',
        confidence: 0,
        alternatives: [],
        reasoning: 'AI service unavailable',
      };
    }
  },

  /**
   * Extract keywords from complaint text
   * Called after complaint submission
   */
  extractKeywords: async (
    title: string,
    description: string,
    category: string,
    municipality: string
  ): Promise<KeywordExtraction> => {
    try {
      const response = await aiClient.post<KeywordExtraction>('/ai/extract-keywords', {
        title,
        description,
        category,
        municipality,
      });
      return response.data;
    } catch (error) {
      console.error('AI keyword extraction error:', error);
      return {
        keywords: [],
        locationKeywords: [],
        urgencyKeywords: [],
        similarityHash: '000000000000',
      };
    }
  },

  /**
   * Calculate SLA for a complaint
   * Called after complaint assignment
   */
  calculateSLA:: string,
    async (
    urgency category: string,
    createdAt?: string
  ): Promise<SLACalculation> => {
    try {
      const response = await aiClient.post<SLACalculation>('/ai/calculate-sla', {
        urgency,
        category,
        created_at: createdAt,
      });
      return response.data;
    } catch (error) {
      console.error('AI SLA calculation error:', error);
      // Return default 7 days
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      return {
        deadline: deadline.toISOString(),
        status: 'ON_TRACK',
        remaining_hours: 168,
        total_hours: 168,
      };
    }
  },
};

// Debounce helper for category prediction
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Check if should trigger AI prediction
export function shouldTriggerPrediction(title: string, description: string): boolean {
  return title.length > 12 && description.length > 20;
}

// Get auto-select threshold
export const AUTO_SELECT_THRESHOLD = 0.85; // 85% confidence
export const SHOW_BADGE_THRESHOLD = 0.6; // 60% confidence
