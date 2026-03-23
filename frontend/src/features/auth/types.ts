export type Role = "owner" | "editor" | "publisher";

export interface AuthUser {
  email: string;
  name: string;
  role: Role | null;
}
