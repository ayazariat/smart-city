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
  role?: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}
