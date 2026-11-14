import type { Page, Route } from "@playwright/test";

// API giả lập: trả dữ liệu mẫu theo đường dẫn, đủ để kiểm tra luồng giao diện
export const API = "http://localhost:5086";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
export const genres = [
  { id: 1, name: "Kiếm hiệp" },
  { id: 2, name: "Trinh thám" },
  { id: 3, name: "Lãng mạn" },
];
const titles = ["Kiếm Khách Bên Sông Hồng", "Vụ Án Phòng Số 7", "Người Gác Đèn Cuối Cùng", "Chuyến Tàu Đêm Qua Đèo", "Mùa Hoa Gạo Đỏ", "Bóng Ma Phố Cổ"];
export const stories = titles.map((title, i) => ({
  id: i + 1,
  title,
  author: ["Lê Minh", "Trần An", "Phạm Thu"][i % 3],
  coverUrl: null,
  status: i % 2 ? "Ongoing" : "Completed",
  accessType: i === 1 ? "Paid" : "Free",
  genres: [genres[i % 3]],
  chapterCount: 10 + i,
  viewCount: 9000 - i * 800,
  createdAt: hoursAgo(500),
  updatedAt: hoursAgo(i + 1),
  latestChapterNumber: 10 + i,
  latestChapterTitle: "Đêm trăng trên bến cũ",
  description: "Chàng kiếm khách trẻ lần theo dấu vết thanh kiếm gãy dưới đáy sông.",
  ratingAverage: 4.5,
  ratingCount: 12,
}));

export const member = { id: 7, username: "vip", email: "vip@doctruyen.local", displayName: "Độc giả VIP", role: "Member", avatarUrl: null, status: "Active" };
export const admin = { ...member, id: 1, username: "admin", displayName: "Quản trị viên", role: "Admin" };

const paged = <T>(items: T[]) => ({ items, page: 1, pageSize: 20, totalCount: items.length, totalPages: 1 });

function detail(id: number) {
  const s = stories[id - 1] ?? stories[0];
  return {
    ...s,
    price: s.accessType === "Paid" ? 30000 : 0,
    freeChapterCount: 0,
    hasFullAccess: false,
    accessSource: null,
    chapters: Array.from({ length: 5 }, (_, i) => ({
      id: id * 100 + i, number: i + 1, title: `Chương thứ ${i + 1}`,
      isFree: s.accessType === "Free" || i === 0, isPublished: true, publishAt: hoursAgo(50 - i), canRead: s.accessType === "Free" || i === 0,
    })),
  };
}

export interface MockState {
  comments: { id: number; chapterId: number; userId: number; displayName: string; avatarUrl: null; content: string; isHidden: boolean; createdAt: string; replies: [] }[];
  ratings: Record<number, number | null>;
}

export async function mockApi(page: Page, opts: { user?: typeof member | null } = {}) {
  const state: MockState = {
    comments: [{ id: 1, chapterId: 100, userId: 3, displayName: "Độc giả Minh", avatarUrl: null, content: "Mở đầu cuốn quá!", isHidden: false, createdAt: hoursAgo(2), replies: [] }],
    ratings: {},
  };

  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const method = req.method();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (p.startsWith("/hubs/")) return route.abort();
    if (p === "/api/auth/login" && method === "POST") {
      const body = req.postDataJSON() as { login: string; password: string };
      if (body.password !== "123456") return json({ title: "Sai tên đăng nhập hoặc mật khẩu", status: 401 }, 401);
      return json({ token: "test-token", expiresAt: new Date(Date.now() + 864e5).toISOString(), user: body.login === "admin" ? admin : member });
    }
    if (p === "/api/auth/me") return opts.user ? json(opts.user) : json({}, 401);
    if (p === "/api/genres") return json(genres);
    if (p === "/api/stories/suggest") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      return json(stories.filter((s) => s.title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().includes(q)).slice(0, 6));
    }
    if (p === "/api/stories") return json(paged(stories));
    const storyMatch = /^\/api\/stories\/(\d+)$/.exec(p);
    if (storyMatch) return json(detail(Number(storyMatch[1])));
    const chapterMatch = /^\/api\/stories\/(\d+)\/chapters\/(\d+)$/.exec(p);
    if (chapterMatch) {
      const [sid, num] = [Number(chapterMatch[1]), Number(chapterMatch[2])];
      if (stories[sid - 1]?.accessType === "Paid" && num > 1) {
        return json({ title: "Bạn cần đăng ký gói đọc hoặc mua truyện để đọc chương này", status: 403, code: opts.user ? "PurchaseRequired" : "LoginRequired", storyTitle: stories[sid - 1].title, price: 30000 }, 403);
      }
      return json({ id: sid * 100 + num - 1, storyId: sid, storyTitle: stories[sid - 1].title, number: num, title: `Chương thứ ${num}`, content: "Sương sớm còn phủ kín mặt sông.\nTiếng mái chèo khua nước đều đặn.", publishAt: hoursAgo(10), prevNumber: num > 1 ? num - 1 : null, nextNumber: num < 5 ? num + 1 : null });
    }
    if (/\/follow$/.test(p)) return json({ storyId: 1, isFollowing: method === "POST", followerCount: method === "POST" ? 11 : 10 });
    const ratingMatch = /^\/api\/stories\/(\d+)\/rating$/.exec(p);
    if (ratingMatch) {
      const id = Number(ratingMatch[1]);
      if (method === "PUT") state.ratings[id] = (req.postDataJSON() as { score: number }).score;
      if (method === "DELETE") state.ratings[id] = null;
      const mine = state.ratings[id] ?? null;
      return json({ storyId: id, average: 4.5, count: 12 + (mine ? 1 : 0), distribution: [0, 1, 1, 4, 6 + (mine ? 1 : 0)], myScore: mine });
    }
    if (/\/similar$/.test(p) || p === "/api/recommendations") return json(stories.slice(2, 5).map((story) => ({ story, reason: "Cùng thể loại Kiếm hiệp" })));
    if (p === "/api/rankings") return json(stories.map((story, i) => ({ rank: i + 1, story, value: 500 - i * 50 })));
    const commentMatch = /^\/api\/chapters\/(\d+)\/comments$/.exec(p);
    if (commentMatch) {
      if (method === "POST") {
        const body = req.postDataJSON() as { content: string };
        const c = { id: state.comments.length + 1, chapterId: Number(commentMatch[1]), userId: opts.user?.id ?? 0, displayName: opts.user?.displayName ?? "", avatarUrl: null, content: body.content, isHidden: false, createdAt: new Date().toISOString(), replies: [] as [] };
        state.comments.push(c);
        return json(c);
      }
      return json(state.comments);
    }
    if (p === "/api/me/reading") return json([]);
    if (p.startsWith("/api/me/reading/")) return route.fulfill({ status: 204 });
    if (p === "/api/me/notifications/unread-count") return json({ count: 2 });
    if (p === "/api/me/notifications") return json([{ id: 1, message: "Truyện \"Vụ Án Phòng Số 7\" vừa có chương 11", storyId: 2, chapterId: 1, chapterNumber: 11, isRead: false, createdAt: hoursAgo(1) }]);
    if (p === "/api/admin/stats/export") {
      return route.fulfill({ status: 200, body: Buffer.from("PK"), headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": 'attachment; filename="thong-ke-test.xlsx"', "access-control-expose-headers": "Content-Disposition" } });
    }
    if (p === "/api/admin/stats") {
      const daily = Array.from({ length: 7 }, (_, i) => ({ date: new Date(Date.now() - (6 - i) * 864e5).toISOString().slice(0, 10), revenue: i * 50000, views: 10 + i, newMembers: i % 2, transactions: i % 3 }));
      return json({ from: daily[0].date, to: daily[6].date, totals: { members: 20, newMembers: 3, activeMembers: 9, stories: 6, chapters: 60, views: 91, revenue: 1050000, successTransactions: 12, pendingTransactions: 1, failedTransactions: 2, packageSubscriptions: 8, packageRenewals: 2, storyPurchases: 2, activePackages: 7, newFollows: 5, newComments: 9 }, daily, revenueByPackage: [{ name: "Gói Tháng", count: 8, revenue: 800000 }], revenueByStory: [], transactionStatuses: [{ status: "Success", count: 12, amount: 1050000 }], topStories: [], genres: [] });
    }
    return json({});
  });
  return state;
}

/** Đăng nhập sẵn bằng cách ghi token vào localStorage trước khi trang tải */
export async function signIn(page: Page, user: typeof member) {
  await page.addInitScript((u) => {
    localStorage.setItem("qldt_token", "test-token");
    localStorage.setItem("qldt_user", JSON.stringify(u));
    localStorage.setItem("qldt_expires", new Date(Date.now() + 864e5).toISOString());
  }, user);
}
