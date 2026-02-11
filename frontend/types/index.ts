export interface User {
  id: string;
  fullName: string;
  email: string;
  role: "CITIZEN" | "MUNICIPAL_AGENT" | "DEPARTMENT_MANAGER" | "ADMIN";
  phone?: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  // Optional CAPTCHA token (e.g. reCAPTCHA v3)
  captchaToken?: string;
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
