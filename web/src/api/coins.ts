import { api } from "./client";
import type {
  CheckInResult,
  ClaimMissionResult,
  CoinBalance,
  CoinPackage,
  CoinTransaction,
  DailyMission,
  PagedResult,
  UnlockChapterResult,
} from "./types";
import type { PaymentStart } from "./payments";

export const coinsApi = {
  /** Lấy số dư xu và trạng thái điểm danh */
  getBalance: () => api.get<CoinBalance>("/api/coins/balance").then((r) => r.data),

  /** Điểm danh nhận xu hằng ngày */
  checkIn: () => api.post<CheckInResult>("/api/coins/check-in").then((r) => r.data),

  /** Danh sách nhiệm vụ hằng ngày và tiến độ */
  getMissions: () => api.get<DailyMission[]>("/api/coins/missions").then((r) => r.data),

  /** Nhận thưởng nhiệm vụ */
  claimMission: (missionKey: string) =>
    api.post<ClaimMissionResult>(`/api/coins/missions/${missionKey}/claim`).then((r) => r.data),

  /** Mở khóa chương truyện bằng 5 xu */
  unlockChapter: (chapterId: number) =>
    api.post<UnlockChapterResult>("/api/coins/unlock-chapter", { chapterId }).then((r) => r.data),

  /** Lịch sử giao dịch xu */
  getHistory: (page = 1, pageSize = 20) =>
    api.get<PagedResult<CoinTransaction>>(`/api/coins/history?page=${page}&pageSize=${pageSize}`).then((r) => r.data),

  /** Danh sách các gói nạp xu */
  getPackages: () => api.get<CoinPackage[]>("/api/coins/packages").then((r) => r.data),

  /** Tạo giao dịch nạp xu */
  startTopUp: (packageId: number, provider = "Mock") =>
    api.post<PaymentStart>("/api/coins/top-up", { packageId, provider }).then((r) => r.data),
};
