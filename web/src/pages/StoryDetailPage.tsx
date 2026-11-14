import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { followApi, type FollowStatus } from "../api/community";
import { recommendationApi, type Recommendation } from "../api/discovery";
import RatingPanel from "../components/RatingPanel";
import RecommendationRow from "../components/RecommendationRow";
import Stars from "../components/Stars";
import { storyApi } from "../api/catalog";
import { getErrorMessage } from "../api/client";
import type { StoryDetail } from "../api/types";
import CoverImage from "../components/CoverImage";
import StatusBadge from "../components/StatusBadge";
import AccessBadge from "../components/AccessBadge";
import { useAuth } from "../auth/useAuth";
import { meApi, type ReadingProgress } from "../api/payments";
import PayButton from "../components/PayButton";
import { formatDate, formatDateTime, formatNumber, formatPrice } from "../utils/format";

// PB13: thông tin truyện + danh sách chương kèm trạng thái truy cập
export default function StoryDetailPage() {
  const id = Number(useParams().id);
  const { user } = useAuth();
  const key = `${id}-${user?.id ?? 0}`;
  const [state, setState] = useState<{ key: string; data?: StoryDetail; error?: string }>();

  useEffect(() => {
    let ignore = false;
    storyApi
      .detail(id)
      .then((data) => !ignore && setState({ key, data }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err, "Không tải được truyện") }));
    return () => {
      ignore = true;
    };
  }, [key, id]);

  // PB26: tiến độ đọc của tôi (đồng bộ giữa Web và Mobile)
  const [progress, setProgress] = useState<{ key: string; data: ReadingProgress | null }>();
  useEffect(() => {
    if (!user) return;
    let ignore = false;
    meApi
      .progress(id)
      .then((data) => !ignore && setProgress({ key, data }))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [key, id, user]);
  const myProgress = user && progress?.key === key ? progress.data : null;

  if (state?.key !== key) return <p className="py-12 text-center text-gray-500">Đang tải...</p>;
  if (state.error || !state.data) return <p className="py-12 text-center text-red-600">{state.error}</p>;

  const story = state.data;
  const published = story.chapters.filter((c) => c.isPublished);
  const first = published[0];
  const latest = published[published.length - 1];

  return (
    <div>
      {/* Đầu trang truyện: nền mực nối với thanh điều hướng */}
      <section className="-mx-4 -mt-6 bg-ink px-4 pb-8 pt-6 text-white sm:rounded-b-2xl">
        <div className="flex flex-col gap-6 sm:flex-row">
          <CoverImage src={story.coverUrl} title={story.title} book className="aspect-3/4 w-44 shrink-0 self-center sm:self-start" />

          <div className="min-w-0 flex-1">
            <h1 className="font-story text-3xl font-semibold leading-tight">{story.title}</h1>
            <p className="mt-1 text-white/70">{story.author}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {story.genres.map((g) => (
                <Link key={g.id} to={`/?theloai=${g.id}`} className="rounded-full border border-white/20 px-2.5 py-0.5 text-xs text-white/80 hover:border-lamp hover:text-white">
                  {g.name}
                </Link>
              ))}
            </div>

            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div><dt className="text-white/55">Số chương</dt><dd className="text-lg font-semibold">{published.length}</dd></div>
              <div><dt className="text-white/55">Lượt đọc</dt><dd className="text-lg font-semibold">{formatNumber(story.viewCount)}</dd></div>
              {story.ratingCount ? (
                <div><dt className="text-white/55">Đánh giá</dt><dd className="flex items-center gap-1.5 text-lg font-semibold">{story.ratingAverage?.toFixed(1)} <Stars value={story.ratingAverage ?? 0} /></dd></div>
              ) : null}
              <div><dt className="text-white/55">Tình trạng</dt><dd className="mt-1"><StatusBadge status={story.status} /></dd></div>
              <div><dt className="text-white/55">Hình thức</dt><dd className="mt-1"><AccessBadge accessType={story.accessType} price={story.price} freeChapterCount={story.freeChapterCount} /></dd></div>
              <div><dt className="text-white/55">Cập nhật</dt><dd className="mt-1">{formatDate(story.updatedAt)}</dd></div>
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {myProgress && (
                <Link to={`/truyen/${story.id}/chuong/${myProgress.chapterNumber}`} className="rounded-full bg-lamp px-5 py-2 text-sm font-semibold text-ink hover:bg-amber-300">
                  Đọc tiếp chương {myProgress.chapterNumber}
                </Link>
              )}
              {first ? (
                <Link to={`/truyen/${story.id}/chuong/${first.number}`}
                  className={myProgress ? "rounded-full border border-white/25 px-5 py-2 text-sm hover:bg-white/10" : "rounded-full bg-lamp px-5 py-2 text-sm font-semibold text-ink hover:bg-amber-300"}>
                  Đọc từ đầu
                </Link>
              ) : (
                <span className="text-sm text-white/60">Truyện chưa có chương nào</span>
              )}
              {latest && latest !== first && (
                <Link to={`/truyen/${story.id}/chuong/${latest.number}`} className="rounded-full border border-white/25 px-5 py-2 text-sm hover:bg-white/10">
                  Chương mới nhất
                </Link>
              )}
              <FollowButton storyId={story.id} />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {story.description && (
            <section className="rounded-xl border bg-white p-5">
              <h2 className="mb-2 font-story text-lg font-semibold">Giới thiệu</h2>
              <p className="whitespace-pre-line font-story leading-relaxed text-gray-800">{story.description}</p>
            </section>
          )}

          <section className="rounded-xl border bg-white p-5">
            <h2 className="mb-3 font-story text-lg font-semibold">Mục lục</h2>
            {story.chapters.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có chương nào</p>
            ) : (
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {story.chapters.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 border-b py-2 text-sm">
                    {c.isPublished ? (
                      <Link to={`/truyen/${story.id}/chuong/${c.number}`} className={`flex-1 truncate hover:text-blue-700 ${myProgress?.chapterNumber === c.number ? "font-semibold text-blue-700" : ""}`}>
                        Chương {c.number}: {c.title}
                      </Link>
                    ) : (
                      <span className="flex-1 truncate text-gray-400">Chương {c.number}: {c.title}</span>
                    )}
                    {!c.isPublished && (
                      <span className="shrink-0 rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">
                        Hẹn giờ {formatDateTime(c.publishAt)}
                      </span>
                    )}
                    {c.isPublished && <ChapterBadge isFree={c.isFree} canRead={c.canRead} />}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <AccessNotice story={story} loggedIn={!!user} />
          <RatingPanel storyId={story.id} />
        </aside>
      </div>

      <SimilarStories storyId={story.id} />
    </div>
  );
}

// PB50: truyện tương tự (cùng thể loại)
function SimilarStories({ storyId }: { storyId: number }) {
  const [state, setState] = useState<{ storyId: number; items: Recommendation[] }>();
  useEffect(() => {
    let ignore = false;
    recommendationApi.similar(storyId, 6).then((items) => !ignore && setState({ storyId, items })).catch(() => {});
    return () => {
      ignore = true;
    };
  }, [storyId]);
  const items = state?.storyId === storyId ? state.items : [];
  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-story text-xl font-semibold">Có thể bạn cũng thích</h2>
      <RecommendationRow items={items} />
    </section>
  );
}

// PB28: theo dõi truyện để nhận thông báo khi có chương mới
function FollowButton({ storyId }: { storyId: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<{ storyId: number; data: FollowStatus }>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    followApi.status(storyId).then((data) => !ignore && setState({ storyId, data })).catch(() => {});
    return () => {
      ignore = true;
    };
  }, [storyId, user]);

  const status = user && state?.storyId === storyId ? state.data : null;

  async function toggle() {
    if (!user) {
      navigate("/login", { state: { from: `/truyen/${storyId}` } });
      return;
    }
    setBusy(true);
    try {
      const data = status?.isFollowing ? await followApi.unfollow(storyId) : await followApi.follow(storyId);
      setState({ storyId, data });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={toggle} disabled={busy} aria-pressed={!!status?.isFollowing}
      className={`rounded-full px-5 py-2 text-sm disabled:opacity-60 ${status?.isFollowing ? "bg-white/15 text-white hover:bg-white/20" : "border border-lamp/70 text-lamp hover:bg-lamp/10"}`}>
      {status?.isFollowing ? "Đang theo dõi" : "Theo dõi"}
      {status ? <span className="ml-1.5 text-white/55">{formatNumber(status.followerCount)}</span> : null}
    </button>
  );
}

// PB22: nhãn từng chương theo quyền của người đang xem
function ChapterBadge({ isFree, canRead }: { isFree: boolean; canRead: boolean }) {
  if (isFree) return <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Miễn phí</span>;
  if (canRead) return <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Đã mở khóa</span>;
  return <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">🔒 Trả phí</span>;
}

const SOURCE_TEXT: Record<string, string> = {
  Package: "Bạn đang đọc truyện này bằng gói đọc còn hạn.",
  Purchase: "Bạn đã mua truyện này, đọc được toàn bộ chương.",
  Admin: "Tài khoản quản trị: đọc được toàn bộ chương.",
};

function AccessNotice({ story, loggedIn }: { story: StoryDetail; loggedIn: boolean }) {
  if (story.accessType === "Free") return null;

  const buy = (label: string, className?: string) => (
    <PayButton kind="story" targetId={story.id} itemName={story.title} amount={story.price} label={label} className={className} />
  );

  if (story.hasFullAccess && story.accessSource) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <span>{SOURCE_TEXT[story.accessSource]}</span>
        {/* Đang đọc bằng gói: vẫn cho mua để giữ quyền đọc khi gói hết hạn */}
        {story.accessSource === "Package" && story.price > 0 &&
          buy(`Mua vĩnh viễn · ${formatPrice(story.price)}`, "rounded border border-blue-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-lamp/50 bg-lamp-soft p-4 text-sm text-amber-900">
      <p>
        Truyện có chương trả phí. Để đọc toàn bộ: mua truyện hoặc đăng ký gói đọc.
        {!loggedIn && " Bạn cần đăng nhập trước khi thanh toán."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {buy(`Mua truyện · ${formatPrice(story.price)}`)}
        <Link to="/goi-doc" className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium hover:bg-amber-50">Xem gói đọc</Link>
      </div>
    </div>
  );
}
