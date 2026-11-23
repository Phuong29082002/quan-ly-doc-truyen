import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "../api/client";
import { meApi, type ReadingItem } from "../api/payments";
import CoverImage from "../components/CoverImage";
import { timeAgo } from "../utils/format";

// PB27: danh sách truyện đang đọc, PB26: đọc tiếp đúng chương (đồng bộ Web và Mobile)
export default function ReadingListPage() {
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{ key: number; data?: ReadingItem[]; error?: string }>();

  useEffect(() => {
    let ignore = false;
    meApi
      .readingList()
      .then((data) => !ignore && setState({ key: reload, data }))
      .catch((err) => !ignore && setState({ key: reload, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [reload]);

  async function remove(storyId: number) {
    if (!confirm("Bỏ truyện này khỏi danh sách đang đọc?")) return;
    try {
      await meApi.removeReading(storyId);
      setReload((r) => r + 1);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Truyện đang đọc</h1>
      <p className="mb-6 text-sm text-gray-600">Tiến độ được lưu tự động, đọc dở trên điện thoại thì mở web vẫn tiếp tục đúng chỗ.</p>

      {!state && <p className="text-gray-500">Đang tải...</p>}
      {state?.error && <p className="text-red-600">{state.error}</p>}
      {state?.data?.length === 0 && (
        <p className="rounded border bg-white p-6 text-center text-gray-500">
          Bạn chưa đọc truyện nào. <Link to="/" className="text-blue-600 underline">Tìm truyện để đọc</Link>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {state?.data?.map((r) => {
          const percent = r.totalChapters > 0 ? Math.round(((r.chapterNumber - 1 + r.position) / r.totalChapters) * 100) : 0;
          return (
            <div key={r.storyId} className="flex gap-4 rounded-lg border bg-white p-3">
              <Link to={`/truyen/${r.storyId}`} className="shrink-0">
                <CoverImage src={r.coverUrl} title={r.storyTitle} className="aspect-3/4 w-20 rounded" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/truyen/${r.storyId}`} className="line-clamp-1 font-semibold hover:text-blue-600">{r.storyTitle}</Link>
                <p className="text-xs text-gray-500">{r.author}</p>
                <p className="mt-1 line-clamp-1 text-sm">Đang đọc: Chương {r.chapterNumber}: {r.chapterTitle}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-gray-100">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, percent)}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-400">{percent}% · {timeAgo(r.updatedAt)}</p>
                <div className="mt-2 flex gap-2">
                  <Link to={`/truyen/${r.storyId}/chuong/${r.chapterNumber}`} className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700">
                    Đọc tiếp
                  </Link>
                  <button onClick={() => remove(r.storyId)} className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">Bỏ khỏi danh sách</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
