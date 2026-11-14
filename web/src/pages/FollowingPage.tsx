import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "../api/client";
import { followApi, type FollowedStory } from "../api/community";
import CoverImage from "../components/CoverImage";
import StatusBadge from "../components/StatusBadge";
import { timeAgo } from "../utils/format";

// PB28: danh sách truyện đang theo dõi, truyện vừa có chương mới lên đầu
export default function FollowingPage() {
  const [state, setState] = useState<{ items?: FollowedStory[]; error?: string }>();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    followApi
      .mine()
      .then((items) => !ignore && setState({ items }))
      .catch((err) => !ignore && setState({ error: getErrorMessage(err, "Không tải được danh sách theo dõi") }));
    return () => {
      ignore = true;
    };
  }, [version]);

  async function unfollow(id: number) {
    await followApi.unfollow(id);
    setVersion((v) => v + 1);
  }

  return (
    <div>
      <h1 className="font-story text-3xl font-semibold">Truyện theo dõi</h1>
      <p className="mt-1 text-sm text-gray-500">Có chương mới bạn sẽ nhận thông báo ngay.</p>

      {!state && <p className="py-12 text-center text-gray-500">Đang tải…</p>}
      {state?.error && <p className="py-12 text-center text-red-600">{state.error}</p>}
      {state?.items?.length === 0 && (
        <div className="mt-8 rounded-xl border bg-white p-8 text-center">
          <p className="text-gray-700">Bạn chưa theo dõi truyện nào.</p>
          <p className="mt-1 text-sm text-gray-500">Bấm “Theo dõi” ở trang truyện để không bỏ lỡ chương mới.</p>
          <Link to="/xep-hang" className="mt-4 inline-block rounded-full bg-ink px-5 py-2 text-sm text-white">Xem bảng xếp hạng</Link>
        </div>
      )}

      {state?.items && state.items.length > 0 && (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {state.items.map((s) => (
            <li key={s.storyId} className="flex gap-4 rounded-xl border bg-white p-3">
              <Link to={`/truyen/${s.storyId}`} className="shrink-0">
                <CoverImage src={s.coverUrl} title={s.title} className="h-24 w-18 rounded-sm" small />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/truyen/${s.storyId}`} className="block truncate font-story font-semibold hover:text-blue-700">{s.title}</Link>
                <p className="flex items-center gap-2 text-xs text-gray-500">{s.author} <StatusBadge status={s.status} /></p>
                {s.latestChapterNumber ? (
                  <Link to={`/truyen/${s.storyId}/chuong/${s.latestChapterNumber}`} className="mt-1.5 block truncate text-sm text-blue-700 hover:underline">
                    Mới nhất: Chương {s.latestChapterNumber}{s.latestChapterTitle ? `: ${s.latestChapterTitle}` : ""}
                  </Link>
                ) : (
                  <p className="mt-1.5 text-sm text-gray-400">Chưa có chương</p>
                )}
                <p className="mt-0.5 text-xs text-gray-500">Cập nhật {timeAgo(s.updatedAt)}</p>
              </div>
              <button onClick={() => unfollow(s.storyId)} className="self-start rounded-full px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-red-600">Bỏ theo dõi</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
