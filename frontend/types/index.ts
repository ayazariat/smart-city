export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "CITIZEN" | "MUNICIPAL_AGENT" | "DEPARTMENT_MANAGER" | "TECHNICIAN" | "ADMIN";
  phone?: string;
  passwordLastChanged?: string;
  createdAt?: string;
  department?: { _id: string; name: string } | null;
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
export type ComplaintCategory = "ROAD" | "LIGHTING" | "WASTE" | "WATER" | "SAFETY" | "PUBLIC_PROPERTY" | "OTHER";
export type ComplaintUrgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ComplaintStatus = "SUBMITTED" | "VALIDATED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REJECTED";
export type MediaType = "photo" | "video";

export interface ComplaintLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  commune?: string;
  governorate?: string;
  municipality?: string;
}

export interface ComplaintMedia {
  type: MediaType;
  url: string;
}

export interface Complaint {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priorityScore: number;
  urgency: ComplaintUrgency;
  location: ComplaintLocation;
  municipality?: string;
  media: ComplaintMedia[];
  createdBy: string | { _id: string; fullName: string; email: string; phone?: string };
  citizen?: { _id: string; fullName: string; email: string; phone?: string } | null;
  department?: { _id: string; name: string } | null;
  assignedTo?: { _id: string; fullName: string; email: string };
  comments?: Array<{
    _id: string;
    text: string;
    author: { _id: string; fullName: string };
    createdAt: string;
  }>;
  isAnonymous?: boolean;
  keywords?: string[];
  rejectionReason?: string;
  resolvedAt?: string;
  assignedDepartment?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  assignedTeam?: {
    _id: string;
    name: string;
  };
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
