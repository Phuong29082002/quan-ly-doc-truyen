import { useEffect, useState } from "react";
import { Link } from "react-router";
import { badgesApi, type Badge, type BadgeSummary } from "../api/badges";
import { getErrorMessage } from "../api/client";

// PB60: chuỗi ngày đọc liên tục và huy hiệu thành tích
export default function BadgesPage() {
  const [state, setState] = useState<{ data?: BadgeSummary; error?: string }>();

  useEffect(() => {
    let ignore = false;
    badgesApi
      .summary()
      .then((data) => !ignore && setState({ data }))
      .catch((err) => !ignore && setState({ error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, []);

  const data = state?.data;

  // Giá trị hiện tại của người dùng ứng với từng loại huy hiệu
  const progressOf = (b: Badge) => (b.criteria === "Streak" ? data?.longestStreak ?? 0 : data?.totalChaptersRead ?? 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Huy hiệu và chuỗi ngày đọc</h1>
      <p className="mb-6 text-sm text-gray-600">
        Đọc truyện mỗi ngày để giữ chuỗi, đọc càng nhiều chương càng mở được nhiều huy hiệu.
      </p>

      {!state && <p className="text-gray-500">Đang tải...</p>}
      {state?.error && <p className="text-red-600">{state.error}</p>}

      {data && (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-white p-4 text-center">
              <p className="text-3xl font-bold text-orange-500">🔥 {data.currentStreak}</p>
              <p className="mt-1 text-sm text-gray-600">Chuỗi ngày hiện tại</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{data.longestStreak}</p>
              <p className="mt-1 text-sm text-gray-600">Chuỗi dài nhất (ngày)</p>
            </div>
            <div className="rounded-lg border bg-white p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{data.totalChaptersRead}</p>
              <p className="mt-1 text-sm text-gray-600">Chương đã đọc</p>
            </div>
          </div>

          <h2 className="mb-3 text-lg font-semibold">
            Huy hiệu ({data.badges.filter((b) => b.earned).length}/{data.badges.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.badges.map((b) => {
              const value = Math.min(progressOf(b), b.threshold);
              const percent = Math.round((value / b.threshold) * 100);
              return (
                <div
                  key={b.id}
                  className={`rounded-lg border p-4 ${b.earned ? "border-amber-300 bg-amber-50" : "bg-white opacity-60"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-4xl ${b.earned ? "" : "grayscale"}`}>{b.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold">{b.name}</p>
                      <p className="text-xs text-gray-600">{b.description}</p>
                    </div>
                  </div>
                  {b.earned ? (
                    <p className="mt-3 text-xs font-medium text-amber-700">
                      Đã đạt ngày {b.earnedAt ? new Date(b.earnedAt).toLocaleDateString("vi-VN") : ""}
                    </p>
                  ) : (
                    <>
                      <div className="mt-3 h-1.5 overflow-hidden rounded bg-gray-200">
                        <div className="h-full bg-blue-500" style={{ width: `${percent}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {value}/{b.threshold} {b.criteria === "Streak" ? "ngày" : "chương"}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-gray-600">
            <Link to="/" className="text-blue-600 underline">Tìm truyện để đọc</Link> và giữ chuỗi ngày của bạn.
          </p>
        </>
      )}
    </div>
  );
}