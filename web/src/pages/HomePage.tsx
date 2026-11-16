import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { genreApi, storyApi, type StorySort } from "../api/catalog";
import { getErrorMessage } from "../api/client";
import { meApi, type ReadingItem } from "../api/payments";
import type { Genre, PagedResult, StoryListItem, StoryStatus } from "../api/types";
import { useAuth } from "../auth/useAuth";
import CoverImage from "../components/CoverImage";
import Pagination from "../components/Pagination";
import StoryCard from "../components/StoryCard";
import Billboard from "../cinema/Billboard";
import ContinueCard from "../cinema/ContinueCard";
import PosterCard from "../cinema/PosterCard";
import Row from "../cinema/Row";
import Top10Card from "../cinema/Top10Card";
import Stars from "../components/Stars";
import { rankingApi, recommendationApi, type RankingItem, type Recommendation } from "../api/discovery";
import { formatNumber, timeAgo } from "../utils/format";

const SORTS: { value: StorySort; label: string }[] = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "newest", label: "Mới đăng" },
  { value: "views", label: "Đọc nhiều" },
];

interface HomeData {
  featured: StoryListItem[];
  updated: StoryListItem[];
  completed: StoryListItem[];
  hot: RankingItem[];
  topRated: RankingItem[];
  byGenre: { genre: Genre; items: StoryListItem[] }[];
}

// PB11: tìm kiếm, lọc, sắp xếp; PB12: các danh sách ở trang chủ
export default function HomePage() {
  const [params, setParams] = useSearchParams();
  const keyword = params.get("q") ?? "";
  const genreId = params.get("theloai") ? Number(params.get("theloai")) : undefined;
  const status = (params.get("tinhtrang") as StoryStatus | null) ?? undefined;
  const sort = (params.get("sapxep") as StorySort | null) ?? "updated";
  const page = Number(params.get("trang") ?? 1);
  const isHomeView = !keyword && !genreId && !status && !params.has("sapxep") && page === 1;
  const key = params.toString();

  const [genres, setGenres] = useState<Genre[]>([]);
  useEffect(() => {
    genreApi.list().then(setGenres).catch(() => setGenres([]));
  }, []);

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("trang" in changes)) next.delete("trang");
    setParams(next);
  }

  if (isHomeView) return <HomeView genres={genres} />;

  return (
    <BrowseView
      key={key}
      genres={genres}
      keyword={keyword}
      genreId={genreId}
      status={status}
      sort={sort}
      page={page}
      update={update}
    />
  );
}

// ---------- Trang chủ ----------

function HomeView({ genres }: { genres: Genre[] }) {
  const { user } = useAuth();
  const [state, setState] = useState<{ data?: HomeData; error?: string }>();
  const [reading, setReading] = useState<{ userId: number; items: ReadingItem[] }>();
  const [recs, setRecs] = useState<{ userId: number; items: Recommendation[] }>();
  const genreKey = genres.slice(0, 3).map((g) => g.id).join(",");

  useEffect(() => {
    let ignore = false;
    const shown = genres.slice(0, 3);
    Promise.all([
      storyApi.search({ sort: "views", pageSize: 10 }),
      storyApi.search({ sort: "updated", pageSize: 16 }),
      storyApi.search({ status: "Completed", sort: "updated", pageSize: 16 }),
      rankingApi.get("views", "week", 10),
      rankingApi.get("rating", "all", 16),
      Promise.all(shown.map((g) => storyApi.search({ genreId: g.id, sort: "views", pageSize: 16 }))),
    ])
      .then(([views, updated, completed, hot, topRated, genreResults]) => {
        if (ignore) return;
        // Truyện đề cử: truyện đọc nhiều có ảnh bìa và mô tả được ưu tiên
        const featured = [...views.items].sort((a, b) => Number(!!b.coverUrl) - Number(!!a.coverUrl)).slice(0, 5);
        const byGenre = shown.map((genre, i) => ({ genre, items: genreResults[i].items })).filter((g) => g.items.length > 0);
        setState({ data: { featured, updated: updated.items, completed: completed.items, hot, topRated, byGenre } });
      })
      .catch((err) => !ignore && setState({ error: getErrorMessage(err, "Không tải được danh sách truyện") }));
    return () => {
      ignore = true;
    };
    // genres chỉ đổi khi danh sách thể loại tải xong, genreKey đại diện cho nó
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genreKey]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    meApi
      .readingList()
      .then((items) => !ignore && setReading({ userId: user.id, items: items.slice(0, 10) }))
      .catch(() => {});
    // PB50: gợi ý theo thể loại hay đọc
    recommendationApi
      .forMe(16)
      .then((items) => !ignore && setRecs({ userId: user.id, items }))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [user]);

  if (!state) return <HomeSkeleton />;
  if (state.error || !state.data) return <p className="py-16 text-center text-red-600">{state.error}</p>;

  const { featured, updated, completed, hot, topRated, byGenre } = state.data;
  const myReading = user && reading?.userId === user.id ? reading.items : [];
  const myRecs = user && recs?.userId === user.id ? recs.items : [];
  const more = (to: string) => <Link to={to} className="text-blue-700 hover:underline">Xem tất cả ›</Link>;

  return (
    <div className="space-y-8 sm:space-y-10">
      <Billboard stories={featured} />

      {/* PB26, PB27: đọc tiếp */}
      {myReading.length > 0 && (
        <Row title={`Đọc tiếp cùng ${user?.displayName ?? "bạn"}`} action={more("/dang-doc")}>
          {myReading.map((r) => <ContinueCard key={r.storyId} item={r} />)}
        </Row>
      )}

      {myRecs.length > 0 && (
        <Row title="Có thể bạn thích">
          {myRecs.map(({ story, reason }) => <PosterCard key={story.id} story={story} note={reason} />)}
        </Row>
      )}

      {hot.length > 0 && (
        <Row title="Top 10 truyện tuần này" action={more("/xep-hang")} gap="gap-2">
          {hot.slice(0, 10).map(({ story, rank }) => <Top10Card key={story.id} rank={rank} story={story} />)}
        </Row>
      )}

      <Row title="Mới cập nhật" action={more("/?sapxep=updated")}>
        {updated.map((s) => (
          <PosterCard key={s.id} story={s} badge={s.latestChapterNumber ? `Ch. ${s.latestChapterNumber}` : undefined}
            note={s.latestChapterTitle ? `Chương ${s.latestChapterNumber}: ${s.latestChapterTitle}, ${timeAgo(s.updatedAt)}` : undefined} />
        ))}
      </Row>

      {topRated.length > 0 && (
        <Row title="Được đánh giá cao" action={more("/xep-hang?loai=rating")}>
          {topRated.map(({ story }) => <PosterCard key={story.id} story={story} />)}
        </Row>
      )}

      {byGenre.map(({ genre, items }) => (
        <Row key={genre.id} title={`Truyện ${genre.name}`} action={more(`/?theloai=${genre.id}`)}>
          {items.map((s) => <PosterCard key={s.id} story={s} />)}
        </Row>
      ))}

      {completed.length > 0 && (
        <Row title="Đã hoàn thành, đọc một mạch" action={more("/?tinhtrang=Completed")}>
          {completed.map((s) => <PosterCard key={s.id} story={s} badge="Full" />)}
        </Row>
      )}

      <section className="grid gap-6 rounded-2xl bg-gradient-to-br from-[#1b1f33] to-[#141729] p-6 ring-1 ring-white/5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h2 className="font-story text-2xl font-semibold text-white">Đọc không giới hạn mọi chương trả phí</h2>
          <p className="mt-1 text-white/65">Đăng ký gói đọc, quét mã chuyển khoản là mở khóa ngay. Đổi gói vẫn giữ số ngày còn lại.</p>
          {genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {genres.map((g) => (
                <Link key={g.id} to={`/?theloai=${g.id}`} className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/75 transition hover:border-lamp hover:text-white">{g.name}</Link>
              ))}
            </div>
          )}
        </div>
        <Link to="/goi-doc" className="justify-self-start rounded-md bg-lamp px-6 py-3 font-semibold text-ink transition hover:bg-amber-300 md:justify-self-end">Xem các gói đọc</Link>
      </section>
    </div>
  );
}

// Khung chờ tải: giữ đúng bố cục để trang không bị nhảy
function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <div className="relative left-1/2 -mt-[5.5rem] h-[34rem] w-screen -translate-x-1/2 animate-pulse bg-[#161a2b]" />
      {[0, 1].map((r) => (
        <div key={r} className="mt-10">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 flex gap-3 overflow-hidden">
            {Array.from({ length: 7 }, (_, i) => <div key={i} className="aspect-3/4 w-32 shrink-0 animate-pulse rounded bg-gray-100 sm:w-40" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Tìm kiếm / lọc ----------

interface BrowseProps {
  genres: Genre[];
  keyword: string;
  genreId?: number;
  status?: StoryStatus;
  sort: StorySort;
  page: number;
  update: (changes: Record<string, string | undefined>) => void;
}

function BrowseView({ genres, keyword, genreId, status, sort, page, update }: BrowseProps) {
  const [result, setResult] = useState<{ data?: PagedResult<StoryListItem>; error?: string }>();
  const [layout, setLayout] = useState<"grid" | "list">(() => {
    try {
      return localStorage.getItem("qldt_layout") === "list" ? "list" : "grid";
    } catch {
      return "grid";
    }
  });
  function changeLayout(l: "grid" | "list") {
    setLayout(l);
    try {
      localStorage.setItem("qldt_layout", l);
    } catch {
      // bỏ qua
    }
  }

  useEffect(() => {
    let ignore = false;
    storyApi
      .search({ keyword: keyword || undefined, genreId, status, sort, page, pageSize: 18 })
      .then((data) => !ignore && setResult({ data }))
      .catch((err) => !ignore && setResult({ error: getErrorMessage(err, "Không tải được danh sách truyện") }));
    return () => {
      ignore = true;
    };
  }, [keyword, genreId, status, sort, page]);

  const genreName = genres.find((g) => g.id === genreId)?.name;
  const title = keyword ? `Kết quả cho “${keyword}”` : genreName ? `Truyện ${genreName}` : status === "Completed" ? "Truyện đã hoàn thành" : SORTS.find((s) => s.value === sort)?.label ?? "Truyện";

  return (
    <div>
      <h1 className="font-story text-2xl font-semibold">{title}</h1>
      {result?.data && <p className="mt-1 text-sm text-gray-500">{result.data.totalCount} truyện</p>}

      <div className="mb-6 mt-4 flex flex-wrap items-center gap-2 border-b pb-4">
        {SORTS.map((s) => (
          <button key={s.value} onClick={() => update({ sapxep: s.value })}
            className={`rounded-full px-4 py-1.5 text-sm ${sort === s.value ? "bg-ink text-white" : "border bg-white text-gray-700 hover:border-gray-400"}`}>
            {s.label}
          </button>
        ))}
        <select aria-label="Tình trạng" value={status ?? ""} onChange={(e) => update({ tinhtrang: e.target.value || undefined })}
          className="rounded-full border bg-white px-3 py-1.5 text-sm">
          <option value="">Mọi tình trạng</option>
          <option value="Ongoing">Đang ra</option>
          <option value="Completed">Hoàn thành</option>
        </select>
        <div className="ml-auto flex rounded-full border bg-white p-0.5" role="group" aria-label="Kiểu hiển thị">
          <button onClick={() => changeLayout("grid")} aria-pressed={layout === "grid"} className={`rounded-full px-3 py-1 text-sm ${layout === "grid" ? "bg-ink text-white" : "text-gray-600"}`}>Lưới</button>
          <button onClick={() => changeLayout("list")} aria-pressed={layout === "list"} className={`rounded-full px-3 py-1 text-sm ${layout === "list" ? "bg-ink text-white" : "text-gray-600"}`}>Danh sách</button>
        </div>
      </div>

      {/* Lọc nhanh theo thể loại */}
      {genres.length > 0 && (
        <div className="-mt-3 mb-6 flex flex-wrap gap-2">
          <button onClick={() => update({ theloai: undefined })}
            className={`rounded-full px-3 py-1 text-sm ${!genreId ? "bg-lamp-soft font-medium text-amber-900 ring-1 ring-lamp" : "border bg-white text-gray-700 hover:border-gray-400"}`}>Tất cả</button>
          {genres.map((g) => (
            <button key={g.id} onClick={() => update({ theloai: String(g.id) })} aria-pressed={genreId === g.id}
              className={`rounded-full px-3 py-1 text-sm ${genreId === g.id ? "bg-lamp-soft font-medium text-amber-900 ring-1 ring-lamp" : "border bg-white text-gray-700 hover:border-gray-400"}`}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {!result && <p className="py-12 text-center text-gray-500">Đang tải…</p>}
      {result?.error && <p className="py-12 text-center text-red-600">{result.error}</p>}
      {result?.data?.items.length === 0 && (
        <div className="py-12 text-center text-gray-600">
          <p>Không có truyện phù hợp.</p>
          <button onClick={() => update({ q: undefined, theloai: undefined, tinhtrang: undefined, sapxep: undefined })} className="mt-2 text-sm text-blue-700 underline">Xóa bộ lọc</button>
        </div>
      )}
      {result?.data && result.data.items.length > 0 && (
        <>
          {layout === "grid" ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {result.data.items.map((s) => <StoryCard key={s.id} story={s} />)}
            </div>
          ) : (
            <ol className="divide-y rounded-xl border bg-white">
              {result.data.items.map((s, i) => (
                <li key={s.id}>
                  <Link to={`/truyen/${s.id}`} className="flex gap-4 p-4 hover:bg-gray-50">
                    <CoverImage src={s.coverUrl} title={s.title} book className="aspect-3/4 w-20 shrink-0 sm:w-24" />
                    <div className="min-w-0">
                      <h3 className="font-story text-lg font-semibold leading-snug">
                        <span className="mr-2 text-gray-400">{(result.data!.page - 1) * result.data!.pageSize + i + 1}</span>{s.title}
                      </h3>
                      <p className="text-sm text-gray-500">{s.author}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                        <span>{formatNumber(s.viewCount)} lượt đọc</span>
                        <span>{s.chapterCount} chương</span>
                        {s.ratingCount ? <span className="flex items-center gap-1"><Stars value={s.ratingAverage ?? 0} size={12} /> {s.ratingAverage?.toFixed(1)}</span> : null}
                        <span>{s.status === "Completed" ? "Hoàn thành" : "Đang ra"}</span>
                      </p>
                      {s.description && <p className="mt-2 line-clamp-2 text-sm text-gray-700">{s.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.genres.map((g) => <span key={g.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{g.name}</span>)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <Pagination page={result.data.page} totalPages={result.data.totalPages} onChange={(p) => update({ trang: p > 1 ? String(p) : undefined })} />
        </>
      )}
    </div>
  );
}
