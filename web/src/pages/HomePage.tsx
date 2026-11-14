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
import RecommendationRow from "../components/RecommendationRow";
import { recommendationApi, type Recommendation } from "../api/discovery";
import { formatNumber, timeAgo } from "../utils/format";

const SORTS: { value: StorySort; label: string }[] = [
  { value: "updated", label: "Mới cập nhật" },
  { value: "newest", label: "Mới đăng" },
  { value: "views", label: "Đọc nhiều" },
];

interface HomeData {
  featured: StoryListItem[];
  updated: StoryListItem[];
  ranking: StoryListItem[];
  completed: StoryListItem[];
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
  const [pick, setPick] = useState(0);
  const [reading, setReading] = useState<{ userId: number; items: ReadingItem[] }>();
  const [recs, setRecs] = useState<{ userId: number; items: Recommendation[] }>();

  useEffect(() => {
    let ignore = false;
    Promise.all([
      storyApi.search({ sort: "views", pageSize: 10 }),
      storyApi.search({ sort: "updated", pageSize: 10 }),
      storyApi.search({ status: "Completed", sort: "updated", pageSize: 6 }),
    ])
      .then(([views, updated, completed]) => {
        if (ignore) return;
        // Truyện đề cử: truyện đọc nhiều có ảnh bìa và mô tả được ưu tiên
        const featured = [...views.items].sort((a, b) => Number(!!b.coverUrl) - Number(!!a.coverUrl)).slice(0, 5);
        setState({ data: { featured, updated: updated.items, ranking: views.items, completed: completed.items } });
      })
      .catch((err) => !ignore && setState({ error: getErrorMessage(err, "Không tải được danh sách truyện") }));
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    meApi
      .readingList()
      .then((items) => !ignore && setReading({ userId: user.id, items: items.slice(0, 4) }))
      .catch(() => {});
    // PB50: gợi ý theo thể loại hay đọc
    recommendationApi
      .forMe(6)
      .then((items) => !ignore && setRecs({ userId: user.id, items }))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [user]);

  if (!state) return <p className="py-16 text-center text-gray-500">Đang tải…</p>;
  if (state.error || !state.data) return <p className="py-16 text-center text-red-600">{state.error}</p>;

  const { featured, updated, ranking, completed } = state.data;
  const hero = featured[pick] ?? featured[0];
  const myReading = user && reading?.userId === user.id ? reading.items : [];
  const myRecs = user && recs?.userId === user.id ? recs.items : [];

  return (
    <div className="space-y-10">
      {/* Khung truyện đề cử nối liền với đầu trang màu mực */}
      {hero && (
        <section className="-mx-4 -mt-6 bg-ink px-4 pb-8 pt-6 text-white sm:rounded-b-2xl">
          <div className="grid items-end gap-6 md:grid-cols-[220px_1fr_200px]">
            <Link to={`/truyen/${hero.id}`} className="mx-auto w-40 md:w-full">
              <CoverImage src={hero.coverUrl} title={hero.title} book className="aspect-3/4 w-full" />
            </Link>
            <div className="min-w-0">
              <p className="text-sm text-lamp">Truyện đề cử</p>
              <h1 className="mt-1 font-story text-3xl font-semibold leading-tight md:text-4xl">{hero.title}</h1>
              <p className="mt-1 text-sm text-white/70">
                {hero.author}, {hero.chapterCount} chương, {formatNumber(hero.viewCount)} lượt đọc
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hero.genres.map((g) => (
                  <Link key={g.id} to={`/?theloai=${g.id}`} className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-white/80 hover:border-lamp hover:text-white">{g.name}</Link>
                ))}
              </div>
              {hero.description && <p className="mt-4 line-clamp-3 max-w-2xl font-story leading-relaxed text-white/85">{hero.description}</p>}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={`/truyen/${hero.id}/chuong/1`} className="rounded-full bg-lamp px-5 py-2 text-sm font-semibold text-ink hover:bg-amber-300">Đọc từ chương 1</Link>
                <Link to={`/truyen/${hero.id}`} className="rounded-full border border-white/25 px-5 py-2 text-sm hover:bg-white/10">Xem mục lục</Link>
              </div>
            </div>
            {featured.length > 1 && (
              <ul className="hidden gap-2 md:grid" aria-label="Chọn truyện đề cử">
                {featured.map((s, i) => (
                  <li key={s.id}>
                    <button onClick={() => setPick(i)} aria-pressed={i === pick}
                      className={`flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-sm ${i === pick ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white"}`}>
                      <CoverImage src={s.coverUrl} title={s.title} className="h-12 w-9 shrink-0 rounded-sm" small />
                      <span className="line-clamp-2 font-story leading-snug">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* PB26, PB27: đọc tiếp nhanh */}
      {myReading.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-story text-xl font-semibold">Đọc tiếp</h2>
            <Link to="/dang-doc" className="text-sm text-blue-700 hover:underline">Tất cả truyện đang đọc</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {myReading.map((r) => (
              <Link key={r.storyId} to={`/truyen/${r.storyId}/chuong/${r.chapterNumber}`} className="flex gap-3 rounded-xl border bg-white p-2.5 hover:border-blue-300">
                <CoverImage src={r.coverUrl} title={r.storyTitle} className="h-16 w-12 shrink-0 rounded-sm" small />
                <span className="min-w-0">
                  <span className="block truncate font-story font-semibold">{r.storyTitle}</span>
                  <span className="block truncate text-xs text-gray-500">Chương {r.chapterNumber}: {r.chapterTitle}</span>
                  <span className="mt-1 block text-xs text-blue-700">{timeAgo(r.updatedAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {myRecs.length > 0 && (
        <section>
          <h2 className="mb-4 font-story text-xl font-semibold">Có thể bạn thích</h2>
          <RecommendationRow items={myRecs} />
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Mới cập nhật: dạng bảng như các trang đọc truyện quen thuộc */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-story text-xl font-semibold">Mới cập nhật</h2>
            <Link to="/?sapxep=updated" className="text-sm text-blue-700 hover:underline">Xem thêm</Link>
          </div>
          <ul className="divide-y rounded-xl border bg-white">
            {updated.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                <CoverImage src={s.coverUrl} title={s.title} className="h-14 w-10 shrink-0 rounded-sm" small />
                <div className="min-w-0 flex-1">
                  <Link to={`/truyen/${s.id}`} className="block truncate font-story font-semibold hover:text-blue-700">{s.title}</Link>
                  <p className="truncate text-xs text-gray-500">{s.genres.map((g) => g.name).join(", ") || s.author}</p>
                </div>
                {s.latestChapterNumber ? (
                  <Link to={`/truyen/${s.id}/chuong/${s.latestChapterNumber}`} className="hidden w-48 shrink-0 truncate text-sm text-gray-700 hover:text-blue-700 sm:block">
                    Chương {s.latestChapterNumber}{s.latestChapterTitle ? `: ${s.latestChapterTitle}` : ""}
                  </Link>
                ) : (
                  <span className="hidden w-48 text-sm text-gray-400 sm:block">Chưa có chương</span>
                )}
                <span className="w-20 shrink-0 text-right text-xs text-gray-500">{timeAgo(s.updatedAt)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-8">
          {/* Xếp hạng là một thứ tự thật nên đánh số */}
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-story text-xl font-semibold">Đọc nhiều nhất</h2>
              <Link to="/xep-hang" className="text-sm text-blue-700 hover:underline">Bảng xếp hạng</Link>
            </div>
            <ol className="rounded-xl border bg-white">
              {ranking.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 border-b px-3 py-2 last:border-0">
                  <span className={`w-6 shrink-0 text-center font-story text-lg font-bold ${i < 3 ? "text-lamp" : "text-gray-400"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/truyen/${s.id}`} className="block truncate text-sm font-medium hover:text-blue-700">{s.title}</Link>
                    <p className="text-xs text-gray-500">{formatNumber(s.viewCount)} lượt đọc</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {genres.length > 0 && (
            <section>
              <h2 className="mb-3 font-story text-xl font-semibold">Thể loại</h2>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Link key={g.id} to={`/?theloai=${g.id}`} className="rounded-full border bg-white px-3 py-1 text-sm text-gray-700 hover:border-blue-400 hover:text-blue-700">
                    {g.name}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {completed.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-story text-xl font-semibold">Đã hoàn thành</h2>
            <Link to="/?tinhtrang=Completed" className="text-sm text-blue-700 hover:underline">Xem thêm</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {completed.map((s) => <StoryCard key={s.id} story={s} />)}
          </div>
        </section>
      )}
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
        <select aria-label="Thể loại" value={genreId ?? ""} onChange={(e) => update({ theloai: e.target.value || undefined })}
          className="ml-auto rounded-full border bg-white px-3 py-1.5 text-sm">
          <option value="">Tất cả thể loại</option>
          {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select aria-label="Tình trạng" value={status ?? ""} onChange={(e) => update({ tinhtrang: e.target.value || undefined })}
          className="rounded-full border bg-white px-3 py-1.5 text-sm">
          <option value="">Mọi tình trạng</option>
          <option value="Ongoing">Đang ra</option>
          <option value="Completed">Hoàn thành</option>
        </select>
      </div>

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
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {result.data.items.map((s) => <StoryCard key={s.id} story={s} />)}
          </div>
          <Pagination page={result.data.page} totalPages={result.data.totalPages} onChange={(p) => update({ trang: p > 1 ? String(p) : undefined })} />
        </>
      )}
    </div>
  );
}
