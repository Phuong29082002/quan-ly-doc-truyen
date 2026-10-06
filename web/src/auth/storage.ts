import type { AuthResponse, User } from "../api/types";

const TOKEN_KEY = "qldt_token";
const USER_KEY = "qldt_user";
const EXPIRES_KEY = "qldt_expires";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuth(res: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  localStorage.setItem(EXPIRES_KEY, res.expiresAt);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

/** Đọc user đã lưu; nếu token hết hạn thì xóa luôn */
export function loadUser(): User | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  const expires = localStorage.getItem(EXPIRES_KEY);

  if (!token || !raw || !expires || new Date(expires) <= new Date()) {
    clearAuth();
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    clearAuth();
    return null;
  }
}
