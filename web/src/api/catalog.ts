import { api } from "./client";
import type {
  ChapterAdmin,
  ChapterContent,
  ChapterRequest,
  Genre,
  PagedResult,
  StoryDetail,
  StoryListItem,
  StoryRequest,
  StoryStatus,
} from "./types";

export type StorySort = "updated" | "newest" | "views";

export interface StorySearchParams {
  keyword?: string;
  genreId?: number;
  status?: StoryStatus;
  sort?: StorySort;
  page?: number;
  pageSize?: number;
}

// PB05
export const genreApi = {
  list: () => api.get<Genre[]>("/api/genres").then((r) => r.data),
  create: (name: string) => api.post<Genre>("/api/genres", { name }).then((r) => r.data),
  update: (id: number, name: string) => api.put<Genre>(`/api/genres/${id}`, { name }).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/genres/${id}`),
};

// PB06, PB07, PB11, PB13, PB14
export const storyApi = {
  search: (params: StorySearchParams) =>
    api.get<PagedResult<StoryListItem>>("/api/stories", { params }).then((r) => r.data),

  detail: (id: number) => api.get<StoryDetail>(`/api/stories/${id}`).then((r) => r.data),

  create: (data: StoryRequest) => api.post<StoryDetail>("/api/stories", data).then((r) => r.data),

  update: (id: number, data: StoryRequest) => api.put<StoryDetail>(`/api/stories/${id}`, data).then((r) => r.data),

  uploadCover: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ coverUrl: string }>(`/api/stories/${id}/cover`, form).then((r) => r.data);
  },

  readChapter: (storyId: number, number: number) =>
    api.get<ChapterContent>(`/api/stories/${storyId}/chapters/${number}`).then((r) => r.data),

  createChapter: (storyId: number, data: ChapterRequest) =>
    api.post<ChapterAdmin>(`/api/stories/${storyId}/chapters`, data).then((r) => r.data),
};

// PB08, PB09
export const chapterApi = {
  get: (id: number) => api.get<ChapterAdmin>(`/api/chapters/${id}`).then((r) => r.data),
  update: (id: number, data: ChapterRequest) => api.put<ChapterAdmin>(`/api/chapters/${id}`, data).then((r) => r.data),
};
