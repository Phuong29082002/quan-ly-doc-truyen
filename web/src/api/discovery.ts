import { api } from "./client";
import type { StoryListItem } from "./types";

// ---------- PB49: đánh giá sao ----------

export interface RatingSummary {
  storyId: number;
  average: number;
  count: number;
  /** distribution[0] = số lượt 1 sao ... distribution[4] = số lượt 5 sao */
  distribution: number[];
  myScore: number | null;
}

export const ratingApi = {
  get: (storyId: number) => api.get<RatingSummary>(`/api/stories/${storyId}/rating`).then((r) => r.data),
  rate: (storyId: number, score: number) => api.put<RatingSummary>(`/api/stories/${storyId}/rating`, { score }).then((r) => r.data),
  remove: (storyId: number) => api.delete<RatingSummary>(`/api/stories/${storyId}/rating`).then((r) => r.data),
};

// ---------- PB49: bảng xếp hạng ----------

export type RankingType = "views" | "rating" | "follows";
export type RankingPeriod = "day" | "week" | "month" | "all";

export interface RankingItem {
  rank: number;
  story: StoryListItem;
  value: number;
}

export const rankingApi = {
  get: (type: RankingType, period: RankingPeriod, limit = 20) =>
    api.get<RankingItem[]>("/api/rankings", { params: { type, period, limit } }).then((r) => r.data),
};

// ---------- PB50: gợi ý ----------

export interface Recommendation {
  story: StoryListItem;
  reason: string;
}

export const recommendationApi = {
  forMe: (limit = 12) => api.get<Recommendation[]>("/api/recommendations", { params: { limit } }).then((r) => r.data),
  similar: (storyId: number, limit = 6) =>
    api.get<Recommendation[]>(`/api/stories/${storyId}/similar`, { params: { limit } }).then((r) => r.data),
};

// ---------- PB61: chatbot gợi ý truyện ----------

export interface ChatbotReply {
  reply: string;
  stories: StoryListItem[];
  suggestions: string[];
}

export const chatbotApi = {
  ask: (message: string) => api.post<ChatbotReply>("/api/chatbot", { message }).then((r) => r.data),
};

// ---------- PB35-37, PB54: thống kê ----------

export interface StatsTotals {
  members: number;
  newMembers: number;
  activeMembers: number;
  stories: number;
  chapters: number;
  views: number;
  revenue: number;
  successTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  packageSubscriptions: number;
  packageRenewals: number;
  storyPurchases: number;
  activePackages: number;
  newFollows: number;
  newComments: number;
}

export interface DailyPoint {
  date: string;
  revenue: number;
  views: number;
  newMembers: number;
  transactions: number;
}

export interface RevenueItem {
  name: string;
  count: number;
  revenue: number;
}

export interface ContentItem {
  storyId: number;
  title: string;
  views: number;
  follows: number;
  purchases: number;
  ratingAverage: number;
  ratingCount: number;
}

export interface Stats {
  from: string;
  to: string;
  totals: StatsTotals;
  daily: DailyPoint[];
  revenueByPackage: RevenueItem[];
  revenueByStory: RevenueItem[];
  transactionStatuses: { status: "Success" | "Pending" | "Failed"; count: number; amount: number }[];
  topStories: ContentItem[];
  genres: { genreId: number; name: string; views: number; stories: number }[];
}

export const statsApi = {
  get: (from: string, to: string) => api.get<Stats>("/api/admin/stats", { params: { from, to } }).then((r) => r.data),

  // PB54: tải file Excel về máy
  export: async (from: string, to: string) => {
    const res = await api.get<Blob>("/api/admin/stats/export", { params: { from, to }, responseType: "blob" });
    const header = String(res.headers["content-disposition"] ?? "");
    const name = /filename="?([^";]+)"?/.exec(header)?.[1] ?? `thong-ke-${from}-${to}.xlsx`;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  },
};
