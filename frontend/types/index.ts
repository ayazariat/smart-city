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
export type ComplaintCategory = "ROAD" | "LIGHTING" | "WASTE" | "WATER" | "SAFETY" | "PUBLIC_PROPERTY" | "GREEN_SPACE" | "TRAFFIC" | "URBAN_PLANNING" | "EQUIPMENT" | "OTHER";
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
  complaintId?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priorityScore: number;
  // In list views we still use `urgency`,
  // detail DTO may expose `urgencyLevel`
  urgency: ComplaintUrgency;
  urgencyLevel?: ComplaintUrgency;
  location: ComplaintLocation;
  municipality?: { _id?: string; name: string; governorate?: string } | string;
  municipalityName?: string;
  media: ComplaintMedia[];
  // Photos taken by technician before starting work
  beforePhotos?: ComplaintWorkPhoto[];
  // Photos taken by technician after completing work
  afterPhotos?: ComplaintWorkPhoto[];
  // In base collection documents this is usually the citizen ObjectId,
  // in the BL‑16 detail DTO it is a trimmed citizen object.
  createdBy: string | { _id: string; fullName: string; email?: string; phone?: string } | null;
  citizen?: { _id: string; fullName: string; email?: string; phone?: string } | null;
  department?: { _id: string; name: string } | null;
  assignedTo?: { _id: string; fullName: string; email: string };
  comments?: Array<{
    _id: string;
    text: string;
    author: { _id: string; fullName: string };
    isInternal?: boolean;
    createdAt: string;
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
  // BL‑16 enriched detail fields (optional on list views)
  slaDeadline?: string | null;
  slaStatus?: "ON_TRACK" | "AT_RISK" | "OVERDUE" | null;
  history?: Array<{
    status: string;
    changedBy?: { fullName: string } | null;
    date: string;
    comment?: string | null;
  }>;
  internalNotes?: Array<{
    content: string;
    author: { _id: string; fullName: string } | null;
    date: string;
    type: "NOTE";
  }>;
  photos?: string[];
  proofPhotos?: string[];
  assignedDepartment?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    categories?: string[];
  };
  assignedTeam?: {
    _id: string;
    name: string;
  };
  departmentId?: string | { _id: string; name: string } | null;
  repairTeamId?: string | { _id: string; name: string } | null;
  assignedTechnicians?: { _id: string; fullName: string }[];
  createdAt: string;
  updatedAt: string;
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
}

export interface Comment {
  _id: string;
  text: string;
  author: { _id: string; fullName: string };
  isInternal?: boolean;
  createdAt: string;
}  
