import axios from "axios";
import { getToken } from "../auth/storage";

export const API_URL = import.meta.env.VITE_API_URL as string;

export const api = axios.create({
  baseURL: API_URL,
});

// Tự gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token hết hạn hoặc không hợp lệ -> báo cho AuthProvider đăng xuất
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && getToken()) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  },
);

/** Lấy câu thông báo lỗi dễ đọc từ ProblemDetails của API */
export function getErrorMessage(error: unknown, fallback = "Đã có lỗi xảy ra"): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Không kết nối được máy chủ";
    const data = error.response.data as { title?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.errors) {
      const first = Object.values(data.errors).flat()[0];
      if (first) return first;
    }
    if (data?.title) return data.title;
  }
  return fallback;
}

/** Ảnh bìa lưu dạng "/uploads/covers/..." -> ghép thêm địa chỉ API */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}
