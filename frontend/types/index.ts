export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "CITIZEN" | "MUNICIPAL_AGENT" | "DEPARTMENT_MANAGER" | "TECHNICIAN" | "ADMIN";
  phone?: string;
  passwordLastChanged?: string;
  createdAt?: string;
  department?: { _id: string; name: string } | null;
  governorate?: string;
  municipality?: { _id: string; name: string } | null;
  municipalityName?: string;
}

export interface RegisterData {
  fullName: string;
  email: string; 
  password: string;
  phone?: string;
  // Optional CAPTCHA token (e.g. reCAPTCHA v3)
  captchaToken?: string;
  // Geographical assignment for citizens
  governorate?: string;
  municipality?: string;
}

export interface LoginData {
  email: string;
  password: string;
  // Optional CAPTCHA token (e.g. reCAPTCHA v3)
  captchaToken?: string;
}

export type VerificationMethod = "email" | "sms";

export interface RequestVerificationPayload {
  email: string;
  phone?: string;
  method: VerificationMethod;
}

export interface VerifyCodePayload {
  email: string;
  phone?: string;
  method: VerificationMethod;
  code: string;
}

// Complaint types
export type ComplaintCategory = "waste" | "roads" | "lighting" | "water" | "safety" | "property" | "parks" | "other";
export type ComplaintUrgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ComplaintStatus = "SUBMITTED" | "VALIDATED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
export type MediaType = "photo" | "video";

export interface ComplaintLocation {
  // Traditional format
  latitude?: number;
  longitude?: number;
  // GeoJSON format (MongoDB geospatial)
  coordinates?: [number, number]; // [longitude, latitude]
  type?: string;
  // Address information
  address?: string;
  commune?: string;
  governorate?: string;
  municipality?: string;
}

export interface ComplaintMedia {
  type: MediaType;
  url: string;
}

export interface ComplaintWorkPhoto {
  type: MediaType;
  url: string;
  takenAt?: string;
  takenBy?: { _id: string; fullName: string };
}

export interface Complaint {
  _id?: string;
  id?: string;
  referenceId?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priorityScore: number;
  urgency: ComplaintUrgency;
  location: ComplaintLocation;
  municipality?: { _id?: string; name: string; governorate?: string } | string;
  municipalityName?: string;
  media: ComplaintMedia[];
  // Photos taken by technician before starting work
  beforePhotos?: ComplaintWorkPhoto[];
  // Photos taken by technician after completing work
  afterPhotos?: ComplaintWorkPhoto[];
  createdBy: string | { _id: string; fullName: string; email: string; phone?: string };
  phone?: string;
  startedAt?: string;
  completedAt?: string;
  citizen?: { _id: string; fullName: string; email: string; phone?: string } | null;
  department?: { _id: string; name: string } | null;
  assignedTo?: { _id: string; fullName: string; email: string };
  comments?: Array<{
    _id: string;
    text: string;
    author: { _id: string; fullName: string };
    isInternal?: boolean;
    createdAt: string;
  }>;
  // History from backend (transformed statusHistory)
  history?: Array<{
    status: string;
    changedBy?: { fullName: string };
    date: string;
    comment?: string;
  }>;
  // Public comments (non-internal)
  publicComments?: Array<{
    _id: string;
    content: string;
    author?: { _id: string; fullName: string };
    date: string;
  }>;
  // Internal notes
  internalNotes?: Array<{
    _id: string;
    content: string;
    author?: { _id: string; fullName: string };
    date: string;
    type: string;
  }>;
  statusHistory?: Array<{
    status: string;
    updatedBy?: { _id: string; fullName: string };
    updatedAt: string;
    notes?: string;
  }>;
  isArchived?: boolean;
  archivedAt?: string;
  isAnonymous?: boolean;
  keywords?: string[];
  rejectionReason?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  resolutionRejectionReason?: string;
  assignedDepartment?: {
    id: string;
    name: string;
  } | null;
  assignedTeam?: {
    _id: string;
    name: string;
    members?: Array<{ _id: string; fullName: string }>;
  };
  // SLA deadline
  slaDeadline?: string | Date | null;
  createdAt: string;
  updatedAt: string;
  // BL-28: Citizen confirmations
  confirmationCount?: number;
  upvoteCount?: number;
  confirmations?: Array<{
    citizenId: string;
    confirmedAt: string;
  }>;
  upvotes?: Array<{
    citizenId: string;
    upvotedAt: string;
  }>;
  // BL-24: AI Urgency Prediction
  aiUrgencyPrediction?: {
    predictedUrgency: string;
    confidenceScore: number;
    breakdown?: {
      textScore: number;
      citizenUrgencyScore: number;
      categoryBaseScore: number;
      communityScore?: number;
      keywordsDetected?: string[];
      citizenUrgencyInput?: string;
    };
    explanation?: string;
    isRuleBased?: boolean;
  } | null;
  aiPredictedUrgency?: string | null;
  // BL-25: AI Duplicate Detection
  aiDuplicateCheck?: {
    isDuplicate: boolean;
    duplicateLevel: string;
    topMatches?: Array<{
      complaintId: string;
      referenceId: string;
      title: string;
      overallScore: number;
      textScore: number;
      geoScore: number;
      categoryScore: number;
      temporalScore: number;
      submittedAt: string;
      status: string;
    }>;
    recommendation?: string;
    humanReviewRequired: boolean;
  } | null;
   duplicateStatus?: string | null;
   duplicateOf?: string | null;
   // Final human decision (for training)
   finalUrgencyHuman?: string | null;
   // Citizen satisfaction rating
   rating?: {
     score: number;
     comment?: string;
     createdAt: string;
     resolvedCorrectly?: boolean;
   };
 }

export interface CreateComplaintData {
  title: string;
  description: string;
  category: ComplaintCategory;
  urgency: ComplaintUrgency;
  location?: ComplaintLocation;
  media?: ComplaintMedia[];
  isAnonymous?: boolean;
  ownerName?: string;
  // optional contact phone; backend may ignore if not supported
  phone?: string;
  // combined incident datetime (ISO string)
  incidentDateTime?: string;
  // additional fields
  municipality?: string;
  governorate?: string;
  incidentDate?: Date;
  incidentTime?: string;
}

export interface Comment {
  _id: string;
  text: string;
  author: { _id: string; fullName: string };
  isInternal?: boolean;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId?: string;           // User who receives this notification
  recipient?: string;       // legacy field, kept for compatibility
  user?: string | { _id: string; fullName: string }; // optional populated user
  type?: string;
  title?: string;           // Optional title, defaults to "Notification"
  message: string;
  complaint?: { _id: string; title: string }; // Populated complaint reference
  complaintId?: string;     // Direct complaint ID (may not be populated)
  relatedId?: string;       // Generic related ID (for backward compatibility)
  isRead: boolean;          // Alias for 'read' field (frontend uses isRead)
  read?: boolean;           // Actual DB field (optional for compatibility)
  metadata?: Record<string, any>; // Additional context
  createdAt: string;
}  
