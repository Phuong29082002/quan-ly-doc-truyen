import { createContext } from "react";
import type { RegisterData, User } from "../api/types";

export interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  login: (login: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
