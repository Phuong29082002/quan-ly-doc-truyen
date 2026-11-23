import { api } from "./client";

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteria: "Streak" | "ChaptersRead";
  threshold: number;
  earned: boolean;
  earnedAt: string | null;
}

export interface BadgeSummary {
  currentStreak: number;
  longestStreak: number;
  totalChaptersRead: number;
  badges: Badge[];
}

// PB60: chuỗi ngày đọc liên tục và huy hiệu thành tích
export const badgesApi = {
  summary: () => api.get<BadgeSummary>("/api/me/badges").then((r) => r.data),
};