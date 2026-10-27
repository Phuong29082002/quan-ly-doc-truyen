import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { storyApi } from "../api/catalog";
import { getErrorMessage } from "../api/client";
import type { StoryDetail } from "../api/types";
import CoverImage from "../components/CoverImage";
import StatusBadge from "../components/StatusBadge";
import AccessBadge from "../components/AccessBadge";
import { useAuth } from "../auth/useAuth";
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

  if (state?.key !== key) return <p className="py-12 text-center text-gray-500">Đang tải...</p>;
  if (state.error || !state.data) return <p className="py-12 text-center text-red-600">{state.error}</p>;

  const story = state.data;
  const published = story.chapters.filter((c) => c.isPublished);
  const first = published[0];
  const latest = published[published.length - 1];

  return (
    <div>
      <div className="flex flex-col gap-6 rounded-lg border bg-white p-5 sm:flex-row">
        <CoverImage src={story.coverUrl} title={story.title} className="aspect-3/4 w-44 shrink-0 self-center rounded sm:self-start" />

        <div className="flex-1">
          <h1 className="text-2xl font-bold">{story.title}</h1>
          <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
            <dt className="text-gray-500">Tác giả</dt>
            <dd>{story.author}</dd>
            <dt className="text-gray-500">Thể loại</dt>
            <dd className="flex flex-wrap gap-1">
              {story.genres.map((g) => (
                <Link key={g.id} to={`/?theloai=${g.id}`} className="rounded bg-gray-100 px-2 py-0.5 text-xs hover:bg-blue-100">
                  {g.name}
                </Link>
              ))}
            </dd>
            <dt className="text-gray-500">Hình thức</dt>
            <dd><AccessBadge accessType={story.accessType} price={story.price} freeChapterCount={story.freeChapterCount} /></dd>
            <dt className="text-gray-500">Tình trạng</dt>
            <dd><StatusBadge status={story.status} /></dd>
            <dt className="text-gray-500">Số chương</dt>
            <dd>{published.length}</dd>
            <dt className="text-gray-500">Lượt đọc</dt>
            <dd>{formatNumber(story.viewCount)}</dd>
            <dt className="text-gray-500">Cập nhật</dt>
            <dd>{formatDate(story.updatedAt)}</dd>
          </dl>

          <div className="mt-4 flex gap-2">
            {first ? (
              <Link to={`/truyen/${story.id}/chuong/${first.number}`} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Đọc từ đầu
              </Link>
            ) : (
              <span className="text-sm text-gray-500">Truyện chưa có chương nào</span>
            )}
            {latest && latest !== first && (
              <Link to={`/truyen/${story.id}/chuong/${latest.number}`} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
                Chương mới nhất
              </Link>
            )}
          </div>

          <AccessNotice story={story} loggedIn={!!user} />

          {story.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-700">{story.description}</p>}
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Danh sách chương</h2>
        {story.chapters.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có chương nào</p>
        ) : (
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {story.chapters.map((c) => (
              <li key={c.id} className="flex items-center gap-2 border-b py-2 text-sm">
                {c.isPublished ? (
                  <Link to={`/truyen/${story.id}/chuong/${c.number}`} className="flex-1 truncate hover:text-blue-600">
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
      </div>
    </div>
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

  if (story.hasFullAccess && story.accessSource) {
    return <p className="mt-4 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{SOURCE_TEXT[story.accessSource]}</p>;
  }

  return (
    <div className="mt-4 rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
      Truyện có chương trả phí. Để đọc toàn bộ: mua truyện ({formatPrice(story.price)}) hoặc{" "}
      <Link to="/goi-doc" className="font-medium underline">đăng ký gói đọc</Link>.
      {!loggedIn && (
        <>
          {" "}Bạn cần <Link to="/login" className="font-medium underline">đăng nhập</Link> trước.
        </>
      )}
    </div>
  );
}
