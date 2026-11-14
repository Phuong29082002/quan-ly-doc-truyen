import { api } from "./client";
import type { PagedResult, StoryStatus } from "./types";

// ---------- PB51: gợi ý tìm kiếm ----------

export interface StorySuggestion {
  id: number;
  title: string;
  author: string;
  coverUrl: string | null;
}

export const suggestApi = {
  suggest: (q: string) => api.get<StorySuggestion[]>("/api/stories/suggest", { params: { q } }).then((r) => r.data),
};

// ---------- PB28: theo dõi truyện ----------

export interface FollowStatus {
  storyId: number;
  isFollowing: boolean;
  followerCount: number;
}

export interface FollowedStory {
  storyId: number;
  title: string;
  author: string;
  coverUrl: string | null;
  status: StoryStatus;
  chapterCount: number;
  latestChapterNumber: number | null;
  latestChapterTitle: string | null;
  updatedAt: string;
  followedAt: string;
}

export const followApi = {
  status: (storyId: number) => api.get<FollowStatus>(`/api/stories/${storyId}/follow`).then((r) => r.data),
  follow: (storyId: number) => api.post<FollowStatus>(`/api/stories/${storyId}/follow`).then((r) => r.data),
  unfollow: (storyId: number) => api.delete<FollowStatus>(`/api/stories/${storyId}/follow`).then((r) => r.data),
  mine: () => api.get<FollowedStory[]>("/api/me/follows").then((r) => r.data),
};

// ---------- PB29, PB46: thông báo ----------

export interface AppNotification {
  id: number;
  message: string;
  storyId: number | null;
  chapterId: number | null;
  chapterNumber: number | null;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  list: () => api.get<AppNotification[]>("/api/me/notifications").then((r) => r.data),
  unreadCount: () => api.get<{ count: number }>("/api/me/notifications/unread-count").then((r) => r.data.count),
  markRead: (id: number) => api.post(`/api/me/notifications/${id}/read`),
  markAllRead: () => api.post("/api/me/notifications/read-all"),
};

export function notificationLink(n: AppNotification): string | null {
  if (n.storyId && n.chapterNumber) return `/truyen/${n.storyId}/chuong/${n.chapterNumber}`;
  if (n.storyId) return `/truyen/${n.storyId}`;
  return null;
}

// ---------- PB30, PB31: thảo luận theo chương ----------

export interface ChapterComment {
  id: number;
  chapterId: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  isHidden: boolean;
  createdAt: string;
  replies: ChapterComment[];
}

export const commentApi = {
  list: (chapterId: number) => api.get<ChapterComment[]>(`/api/chapters/${chapterId}/comments`).then((r) => r.data),
  create: (chapterId: number, content: string, parentId?: number) =>
    api.post<ChapterComment>(`/api/chapters/${chapterId}/comments`, { content, parentId }).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/comments/${id}`),
  report: (id: number, reason: string) => api.post(`/api/comments/${id}/report`, { reason }),
};

// ---------- PB32: kiểm duyệt ----------

export type ReportStatus = "Pending" | "Resolved" | "Rejected";

export interface CommentReport {
  id: number;
  commentId: number;
  commentContent: string;
  commentHidden: boolean;
  commentUserId: number;
  commentAuthor: string;
  reporter: string;
  reason: string;
  status: ReportStatus;
  storyId: number;
  storyTitle: string;
  chapterNumber: number;
  pendingReportsOfComment: number;
  createdAt: string;
}

export interface AdminComment {
  id: number;
  content: string;
  isHidden: boolean;
  userId: number;
  username: string;
  displayName: string;
  storyId: number;
  storyTitle: string;
  chapterNumber: number;
  reportCount: number;
  createdAt: string;
}

export const moderationApi = {
  reports: (status?: ReportStatus, page = 1) =>
    api.get<PagedResult<CommentReport>>("/api/admin/reports", { params: { status, page } }).then((r) => r.data),
  resolve: (id: number, action: "Hide" | "Delete" | "Reject") => api.post(`/api/admin/reports/${id}/resolve`, { action }),
  comments: (params: { keyword?: string; hidden?: boolean; page?: number }) =>
    api.get<PagedResult<AdminComment>>("/api/admin/comments", { params }).then((r) => r.data),
  setHidden: (id: number, hidden: boolean) => api.patch(`/api/admin/comments/${id}/hidden`, { hidden }),
  remove: (id: number) => api.delete(`/api/comments/${id}`),
};

// ---------- PB33, PB34: quản lý thành viên ----------

export type UserStatus = "Active" | "Restricted" | "Suspended";

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  Active: "Hoạt động",
  Restricted: "Bị hạn chế",
  Suspended: "Tạm ngừng",
};

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: "Member" | "Admin";
  status: UserStatus;
  statusReason: string | null;
  createdAt: string;
  activePackage: string | null;
  activePackageEndAt: string | null;
  purchasedStories: number;
  totalPaid: number;
  commentCount: number;
  lastReadAt: string | null;
}

export interface AdminUserDetail {
  user: AdminUser;
  recentTransactions: import("./payments").Transaction[];
  reading: import("./payments").ReadingItem[];
  follows: FollowedStory[];
  reportsAgainst: number;
}

export const adminUserApi = {
  search: (params: { keyword?: string; status?: UserStatus; page?: number }) =>
    api.get<PagedResult<AdminUser>>("/api/admin/users", { params }).then((r) => r.data),
  detail: (id: number) => api.get<AdminUserDetail>(`/api/admin/users/${id}`).then((r) => r.data),
  setStatus: (id: number, status: UserStatus, reason?: string) =>
    api.patch<AdminUser>(`/api/admin/users/${id}/status`, { status, reason }).then((r) => r.data),
};
