// Kiểu dữ liệu khớp với DTO bên backend

export type Role = "Member" | "Admin";

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export type StoryStatus = "Ongoing" | "Completed";
export type AccessType = "Free" | "Paid" | "Mixed";

export interface Genre {
  id: number;
  name: string;
  storyCount: number;
}

export interface GenreRef {
  id: number;
  name: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface StoryListItem {
  id: number;
  title: string;
  author: string;
  coverUrl: string | null;
  status: StoryStatus;
  accessType: AccessType;
  genres: GenreRef[];
  chapterCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterListItem {
  id: number;
  number: number;
  title: string;
  isFree: boolean;
  isPublished: boolean;
  publishAt: string;
}

export interface StoryDetail {
  id: number;
  title: string;
  author: string;
  description: string | null;
  coverUrl: string | null;
  status: StoryStatus;
  accessType: AccessType;
  price: number;
  freeChapterCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  genres: GenreRef[];
  chapters: ChapterListItem[];
}

export interface StoryRequest {
  title: string;
  author: string;
  description?: string;
  status: StoryStatus;
  genreIds: number[];
}

export interface ChapterContent {
  id: number;
  storyId: number;
  storyTitle: string;
  number: number;
  title: string;
  content: string;
  publishAt: string;
  prevNumber: number | null;
  nextNumber: number | null;
}

export interface ChapterAdmin {
  id: number;
  storyId: number;
  number: number;
  title: string;
  content: string;
  isFree: boolean;
  publishAt: string;
}

export interface ChapterRequest {
  number: number;
  title: string;
  content: string;
  isFree: boolean;
  publishAt?: string | null;
}

export const STATUS_LABEL: Record<StoryStatus, string> = {
  Ongoing: "Đang ra",
  Completed: "Hoàn thành",
};
