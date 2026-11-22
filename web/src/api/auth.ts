import { api } from "./client";
import type { AuthResponse, RegisterData, User } from "./types";

export const authApi = {
  login: (login: string, password: string) =>
    api.post<AuthResponse>("/api/auth/login", { login, password }).then((r) => r.data),

  register: (data: RegisterData) =>
    api.post<AuthResponse>("/api/auth/register", data).then((r) => r.data),

  me: () => api.get<User>("/api/auth/me").then((r) => r.data),

  // PB04
  updateProfile: (displayName: string) => api.put<User>("/api/auth/me", { displayName }).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/auth/change-password", { currentPassword, newPassword }),

  // PB57 Google login
  googleLogin: (idToken: string) =>
    api.post<AuthResponse>("/api/auth/google", { idToken }).then((r) => r.data),

  // Quên mật khẩu: gửi OTP qua email
  forgotPassword: (email: string) =>
    api.post("/api/auth/forgot-password", { email }).then((r) => r.data),

  // Đặt lại mật khẩu bằng OTP
  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post("/api/auth/reset-password", { email, otp, newPassword }).then((r) => r.data),
};

