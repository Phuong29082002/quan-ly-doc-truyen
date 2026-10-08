import { api } from "./client";

export type PackageScope = "All" | "Selected";

export interface PackageStoryRef {
  id: number;
  title: string;
}

export interface PackageItem {
  id: number;
  name: string;
  price: number;
  durationDays: number;
  scope: PackageScope;
  isActive: boolean;
  createdAt: string;
  activeUserCount: number;
  stories: PackageStoryRef[];
}

export interface PackageRequest {
  name: string;
  price: number;
  durationDays: number;
  scope: PackageScope;
  isActive: boolean;
  storyIds: number[];
}

// PB18: quản lý gói đọc tháng
export const packageApi = {
  /** Gói đang bán (công khai) */
  listActive: () => api.get<PackageItem[]>("/api/packages").then((r) => r.data),
  /** Tất cả gói, kể cả đã ngừng cung cấp (Admin) */
  listAll: () => api.get<PackageItem[]>("/api/packages/admin").then((r) => r.data),
  create: (data: PackageRequest) => api.post<PackageItem>("/api/packages", data).then((r) => r.data),
  update: (id: number, data: PackageRequest) => api.put<PackageItem>(`/api/packages/${id}`, data).then((r) => r.data),
};
