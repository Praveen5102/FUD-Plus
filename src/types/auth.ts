export interface LoginPayload {
  email: string;

  password: string;
}

export interface AuthUser {
  id: string;

  email: string;

  role: "admin" | "employee";

  name: string;
}
