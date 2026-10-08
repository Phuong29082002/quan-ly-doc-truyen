import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { storyApi } from "../api/catalog";
import { getErrorMessage } from "../api/client";
import type { StoryDetail } from "../api/types";
import CoverImage from "../components/CoverImage";
import StatusBadge from "../components/StatusBadge";
import { formatDate, formatDateTime, formatNumber } from "../utils/format";

// PB13: thông tin truyện + danh sách chương kèm trạng thái truy cập
export default function StoryDetailPage() {
  const id = Number(useParams().id);
  const [state, setState] = useState<{ id: number; data?: StoryDetail; error?: string }>();

  useEffect(() => {
    let ignore = false;
    storyApi
      .detail(id)
      .then((data) => !ignore && setState({ id, data }))
      .catch((err) => !ignore && setState({ id, error: getErrorMessage(err, "Không tải được truyện") }));
    return () => {
      ignore = true;
    };
  }, [id]);

  if (state?.id !== id) return <p className="py-12 text-center text-gray-500">Đang tải...</p>;
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
                {c.isPublished && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${c.isFree ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {c.isFree ? "Miễn phí" : "Trả phí"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
