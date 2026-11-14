import { api } from "./client";
import type { PagedResult } from "./types";

export type PaymentProvider = "Mock" | "VNPay" | "BankQR";
export type TransactionType = "Package" | "Story";
export type TransactionStatus = "Pending" | "Success" | "Failed";

export interface PaymentProviders {
  mock: boolean;
  vnPay: boolean;
  bankQr: boolean;
}

/** Chuyển khoản quét mã VietQR */
export interface BankQr {
  transactionId: number;
  qrImageUrl: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  amount: number;
  transferContent: string;
  expiresAt: string;
  status: TransactionStatus;
}

export interface PaymentStart {
  transactionId: number;
  provider: PaymentProvider;
  /** Link sang VNPay; null = cổng giả lập */
  paymentUrl: string | null;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  packageId: number | null;
  packageName: string | null;
  storyId: number | null;
  storyTitle: string | null;
  createdAt: string;
  paidAt: string | null;
  isRenewal: boolean;
  packageEndAt: string | null;
}

export interface MyPackage {
  id: number;
  packageId: number;
  packageName: string;
  scope: "All" | "Selected";
  startAt: string;
  endAt: string;
  isActive: boolean;
}

export interface MyPurchase {
  storyId: number;
  storyTitle: string;
  coverUrl: string | null;
  price: number;
  purchasedAt: string;
}

export interface MyLibrary {
  packages: MyPackage[];
  purchases: MyPurchase[];
}

export interface AdminTransaction {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  itemName: string | null;
  createdAt: string;
  paidAt: string | null;
  missingRights: boolean;
  transferContent: string;
}

export interface AdminTransactionQuery {
  status?: TransactionStatus;
  missingRights?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface ReadingProgress {
  storyId: number;
  chapterNumber: number;
  chapterTitle: string;
  position: number;
  updatedAt: string;
}

export interface ReadingItem {
  storyId: number;
  storyTitle: string;
  author: string;
  coverUrl: string | null;
  chapterNumber: number;
  chapterTitle: string;
  totalChapters: number;
  position: number;
  updatedAt: string;
}

export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  Pending: "Đang chờ",
  Success: "Thành công",
  Failed: "Thất bại",
};

// PB19, PB20, PB21, PB23, PB45
export const paymentApi = {
  providers: () => api.get<PaymentProviders>("/api/payments/providers").then((r) => r.data),
  payPackage: (packageId: number, provider: PaymentProvider) =>
    api.post<PaymentStart>("/api/payments/package", { packageId, provider }).then((r) => r.data),
  payStory: (storyId: number, provider: PaymentProvider) =>
    api.post<PaymentStart>("/api/payments/story", { storyId, provider }).then((r) => r.data),
  mockResult: (id: number, success: boolean) =>
    api.post<Transaction>(`/api/payments/${id}/mock-result`, { success }).then((r) => r.data),
  get: (id: number) => api.get<Transaction>(`/api/payments/${id}`).then((r) => r.data),
  bankQr: (id: number) => api.get<BankQr>(`/api/payments/${id}/bank-qr`).then((r) => r.data),
};

// PB25, PB26, PB27
export const meApi = {
  transactions: () => api.get<Transaction[]>("/api/me/transactions").then((r) => r.data),
  library: () => api.get<MyLibrary>("/api/me/library").then((r) => r.data),
  readingList: () => api.get<ReadingItem[]>("/api/me/reading").then((r) => r.data),
  /** null nếu chưa đọc truyện này (API trả 204) */
  progress: (storyId: number) =>
    api.get<ReadingProgress | "">(`/api/me/reading/${storyId}`).then((r) => (r.status === 204 || !r.data ? null : r.data)),
  saveProgress: (storyId: number, chapterNumber: number, position: number) =>
    api.put<ReadingProgress>("/api/me/reading", { storyId, chapterNumber, position }).then((r) => r.data),
  removeReading: (storyId: number) => api.delete(`/api/me/reading/${storyId}`),
};

// PB24
export const adminTransactionApi = {
  search: (params: AdminTransactionQuery) =>
    api.get<PagedResult<AdminTransaction>>("/api/admin/transactions", { params }).then((r) => r.data),
  grant: (id: number) => api.post<AdminTransaction>(`/api/admin/transactions/${id}/grant`).then((r) => r.data),
  /** Chuyển khoản QR: xác nhận đã nhận tiền (true) hoặc hủy giao dịch (false) */
  confirm: (id: number, received: boolean) =>
    api.post<AdminTransaction>(`/api/admin/transactions/${id}/confirm`, { received }).then((r) => r.data),
};
