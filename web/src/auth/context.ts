import { createContext } from "react";
import type { RegisterData, User } from "../api/types";

export interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  login: (login: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
  /** Cập nhật user trong bộ nhớ + localStorage (PB04) */
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
