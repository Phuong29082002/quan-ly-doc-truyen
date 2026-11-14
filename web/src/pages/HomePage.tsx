import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { genreApi, storyApi, type StorySort } from "../api/catalog";
import { assetUrl, getErrorMessage } from "../api/client";
import { meApi, type ReadingItem } from "../api/payments";
import type { Genre, PagedResult, StoryListItem, StoryStatus } from "../api/types";
import { useAuth } from "../auth/useAuth";
import CoverImage from "../components/CoverImage";
import Pagination from "../components/Pagination";
import StoryCard from "../components/StoryCard";
import Carousel, { CarouselItem } from "../components/Carousel";
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
  topFollowed: RankingItem[];
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
      storyApi.search({ sort: "updated", pageSize: 12 }),
      storyApi.search({ status: "Completed", sort: "updated", pageSize: 12 }),
      rankingApi.get("views", "week", 10),
      rankingApi.get("rating", "all", 5),
      rankingApi.get("follows", "month", 5),
    ])
      .then(([views, updated, completed, hot, topRated, topFollowed]) => {
        if (ignore) return;
        // Truyện đề cử: truyện đọc nhiều có ảnh bìa và mô tả được ưu tiên
        const featured = [...views.items].sort((a, b) => Number(!!b.coverUrl) - Number(!!a.coverUrl)).slice(0, 5);
        setState({ data: { featured, updated: updated.items, completed: completed.items, hot, topRated, topFollowed } });
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
      .forMe(10)
      .then((items) => !ignore && setRecs({ userId: user.id, items }))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [user]);

  if (!state) return <p className="py-16 text-center text-gray-500">Đang tải…</p>;
  if (state.error || !state.data) return <p className="py-16 text-center text-red-600">{state.error}</p>;

  const { featured, updated, completed, hot, topRated, topFollowed } = state.data;
  const hero = featured[pick] ?? featured[0];
  const myReading = user && reading?.userId === user.id ? reading.items : [];
  const myRecs = user && recs?.userId === user.id ? recs.items : [];
  const heroCover = assetUrl(hero?.coverUrl);

  return (
    <div className="space-y-12">
      {/* Truyện đề cử: nền là ảnh bìa làm mờ, nối liền với đầu trang màu mực */}
      {hero && (
        <section className="relative -mx-4 -mt-6 overflow-hidden bg-ink px-4 pb-8 pt-6 text-white sm:rounded-b-2xl">
          {heroCover && (
            <img src={heroCover} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl" />
          )}
          <div className="relative grid items-end gap-6 md:grid-cols-[220px_1fr_210px]">
            <Link to={`/truyen/${hero.id}`} className="mx-auto w-28 sm:w-40 md:w-full">
              <CoverImage src={hero.coverUrl} title={hero.title} book className="aspect-3/4 w-full" />
            </Link>
            <div className="min-w-0">
              <p className="text-sm text-lamp">Truyện đề cử</p>
              <h1 className="mt-1 font-story text-3xl font-semibold leading-tight md:text-4xl">{hero.title}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-white/70">
                <span>{hero.author}, {hero.chapterCount} chương, {formatNumber(hero.viewCount)} lượt đọc</span>
                {hero.ratingCount ? <span className="flex items-center gap-1"><Stars value={hero.ratingAverage ?? 0} size={13} /> {hero.ratingAverage?.toFixed(1)}</span> : null}
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
          {/* Điện thoại: chấm chuyển truyện đề cử */}
          {featured.length > 1 && (
            <div className="relative mt-5 flex justify-center gap-2 md:hidden">
              {featured.map((s, i) => (
                <button key={s.id} onClick={() => setPick(i)} aria-label={`Truyện đề cử ${i + 1}: ${s.title}`}
                  className={`h-2 rounded-full transition-all ${i === pick ? "w-6 bg-lamp" : "w-2 bg-white/35"}`} />
              ))}
            </div>
          )}
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
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-story font-semibold">{r.storyTitle}</span>
                  <span className="block truncate text-xs text-gray-500">Chương {r.chapterNumber}: {r.chapterTitle}</span>
                  {/* Thanh tiến độ: đã đọc tới chương nào trên tổng số chương */}
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-gray-100">
                    <span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, (r.chapterNumber / Math.max(1, r.totalChapters)) * 100)}%` }} />
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">{timeAgo(r.updatedAt)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {myRecs.length > 0 && (
        <Carousel title="Có thể bạn thích">
          {myRecs.map(({ story, reason }) => (
            <CarouselItem key={story.id}>
              <StoryCard story={story} note={reason} />
            </CarouselItem>
          ))}
        </Carousel>
      )}

      {hot.length > 0 && (
        <Carousel title="Đang hot tuần này" action={<Link to="/xep-hang" className="text-sm text-blue-700 hover:underline">Bảng xếp hạng</Link>}>
          {hot.map(({ story, rank }) => (
            <CarouselItem key={story.id}>
              <StoryCard story={story} rank={rank} />
            </CarouselItem>
          ))}
        </Carousel>
      )}

      {/* Ba bảng xếp hạng đặt cạnh nhau */}
      <section className="grid gap-4 md:grid-cols-3">
        <RankColumn title="Đọc nhiều tuần" link="/xep-hang?loai=views&ky=week" items={hot.slice(0, 5)} value={(v) => `${formatNumber(v)} lượt đọc`} />
        <RankColumn title="Đánh giá cao" link="/xep-hang?loai=rating" items={topRated} value={(v) => `${v.toFixed(1)} điểm`} />
        <RankColumn title="Theo dõi nhiều tháng" link="/xep-hang?loai=follows&ky=month" items={topFollowed} value={(v) => `${formatNumber(v)} người theo dõi`} />
      </section>

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
          <section className="rounded-xl bg-ink p-5 text-white">
            <h2 className="font-story text-lg font-semibold">Đọc không giới hạn</h2>
            <p className="mt-1 text-sm text-white/75">Gói đọc tháng mở khóa toàn bộ chương trả phí, quét mã chuyển khoản là dùng được ngay.</p>
            <Link to="/goi-doc" className="mt-4 inline-block rounded-full bg-lamp px-4 py-1.5 text-sm font-semibold text-ink hover:bg-amber-300">Xem gói đọc</Link>
          </section>
        </aside>
      </div>

      {completed.length > 0 && (
        <Carousel title="Đã hoàn thành" action={<Link to="/?tinhtrang=Completed" className="text-sm text-blue-700 hover:underline">Xem thêm</Link>}>
          {completed.map((s) => (
            <CarouselItem key={s.id}>
              <StoryCard story={s} />
            </CarouselItem>
          ))}
        </Carousel>
      )}
    </div>
  );
}

function RankColumn({ title, link, items, value }: { title: string; link: string; items: RankingItem[]; value: (v: number) => string }) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-story text-lg font-semibold">{title}</h2>
        <Link to={link} className="text-xs text-blue-700 hover:underline">Xem tất cả</Link>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-gray-500">Chưa có dữ liệu</p>
      ) : (
        <ol>
          {items.map((item) => (
            <li key={item.story.id}>
              <Link to={`/truyen/${item.story.id}`} className="flex items-center gap-3 rounded-lg px-1 py-2 hover:bg-gray-50">
                <span className={`w-5 shrink-0 text-center font-story text-lg font-bold ${item.rank <= 3 ? "text-lamp" : "text-gray-300"}`}>{item.rank}</span>
                <CoverImage src={item.story.coverUrl} title={item.story.title} className="h-12 w-9 shrink-0 rounded-sm" small />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.story.title}</span>
                  <span className="block text-xs text-gray-500">{value(item.value)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
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
