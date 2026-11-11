import { api } from "./client";

export interface PaymentResult { transactionId: number; status: "Pending" | "Success" | "Failed"; amount: number; createdAt: string; paidAt: string | null; message: string; }
export interface PaymentOverview { transactions: { id: number; type: string; itemName: string | null; amount: number; status: string; createdAt: string; paidAt: string | null }[]; purchasedStories: { storyId: number; title: string; price: number; purchasedAt: string }[]; packages: { packageId: number; packageName: string; startAt: string; endAt: string; isActive: boolean; isPaused: boolean; remainingDays: number }[]; }
export interface ReadingProgress { storyId: number; storyTitle: string; chapterId: number; chapterNumber: number; chapterTitle: string; position: number; updatedAt: string; }
export const paymentApi = {
  checkout: (type: "Package" | "Story", itemId: number, simulateSuccess = true, packageMode: "Purchase" | "Renew" | "Switch" | "Restore" = "Purchase") => api.post<PaymentResult>("/api/payments/checkout", { type, itemId, simulateSuccess, packageMode }).then(r => r.data),
  history: () => api.get<PaymentOverview>("/api/payments/history").then(r => r.data),
  reconciliation: () => api.get<{ transactionId: number; userId: number; username: string; type: string; packageId: number | null; storyId: number | null; amount: number; paidAt: string }[]>("/api/payments/reconciliation").then(r => r.data),
  reconcile: (id: number) => api.post(`/api/payments/reconciliation/${id}`).then(r => r.data),
  saveProgress: (storyId: number, chapterId: number, position = 0) => api.put<ReadingProgress>("/api/reading-progress", { storyId, chapterId, position }).then(r => r.data),
  progress: () => api.get<ReadingProgress[]>("/api/reading-progress").then(r => r.data),
};
