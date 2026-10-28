import { api } from "./client";
import type { AuthResponse, RegisterData, User } from "./types";

export const authApi = {
  login: (login: string, password: string) =>
    api.post<AuthResponse>("/api/auth/login", { login, password }).then((r) => r.data),

  register: (data: RegisterData) =>
    api.post<AuthResponse>("/api/auth/register", data).then((r) => r.data),

  me: () => api.get<User>("/api/auth/me").then((r) => r.data),

  // PB04
  updateProfile: (displayName: string) =>
    api.put<User>("/api/auth/me", { displayName }).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<User>("/api/auth/me/avatar", form).then((r) => r.data);
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put("/api/auth/password", { currentPassword, newPassword }),
};
