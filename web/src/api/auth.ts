import { api } from "./client";
import type { AuthResponse, RegisterData, User } from "./types";

export const authApi = {
  login: (login: string, password: string) =>
    api.post<AuthResponse>("/api/auth/login", { login, password }).then((r) => r.data),

  register: (data: RegisterData) =>
    api.post<AuthResponse>("/api/auth/register", data).then((r) => r.data),

  me: () => api.get<User>("/api/auth/me").then((r) => r.data),
};
