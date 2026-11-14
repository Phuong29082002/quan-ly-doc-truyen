import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getErrorMessage } from "../api/client";
import { rankingApi, type RankingItem, type RankingPeriod, type RankingType } from "../api/discovery";
import CoverImage from "../components/CoverImage";
import Stars from "../components/Stars";
import { formatNumber } from "../utils/format";

const TYPES: { value: RankingType; label: string }[] = [
  { value: "views", label: "Đọc nhiều" },
  { value: "rating", label: "Đánh giá cao" },
  { value: "follows", label: "Theo dõi nhiều" },
];

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: "day", label: "Hôm nay" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "all", label: "Mọi lúc" },
];

function valueText(type: RankingType, value: number) {
  if (type === "rating") return `${value.toFixed(1)} điểm`;
  if (type === "follows") return `${formatNumber(value)} người theo dõi`;
  return `${formatNumber(value)} lượt đọc`;
}

// PB49: bảng xếp hạng theo ngày / tuần / tháng
export default function RankingPage() {
  const [params, setParams] = useSearchParams();
  const type = (params.get("loai") as RankingType | null) ?? "views";
  const period = (params.get("ky") as RankingPeriod | null) ?? "week";
  const key = `${type}-${period}`;
  const [state, setState] = useState<{ key: string; items?: RankingItem[]; error?: string }>();

  useEffect(() => {
    let ignore = false;
    rankingApi
      .get(type, period, 30)
      .then((items) => !ignore && setState({ key, items }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err, "Không tải được bảng xếp hạng") }));
    return () => {
      ignore = true;
    };
  }, [key, type, period]);

  function set(k: string, v: string) {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  }

  const items = state?.key === key ? state.items : undefined;
  const [first, ...rest] = items ?? [];

  return (
    <div>
      <h1 className="font-story text-3xl font-semibold">Bảng xếp hạng</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-b pb-4">
        <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-gray-200" role="tablist" aria-label="Loại xếp hạng">
          {TYPES.map((t) => (
            <button key={t.value} role="tab" aria-selected={type === t.value} onClick={() => set("loai", t.value)}
              className={`rounded-full px-4 py-1.5 text-sm ${type === t.value ? "bg-ink text-white" : "text-gray-700 hover:bg-gray-100"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {type !== "rating" && (
          <div className="flex gap-1" role="tablist" aria-label="Khoảng thời gian">
            {PERIODS.map((p) => (
              <button key={p.value} role="tab" aria-selected={period === p.value} onClick={() => set("ky", p.value)}
                className={`rounded-full px-3 py-1.5 text-sm ${period === p.value ? "bg-lamp-soft font-medium text-amber-900 ring-1 ring-lamp" : "text-gray-600 hover:text-gray-900"}`}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        {type === "rating" && <p className="text-sm text-gray-500">Tính theo điểm trung bình, có xét số lượt đánh giá</p>}
      </div>

      {state?.key !== key && <p className="py-12 text-center text-gray-500">Đang tải…</p>}
      {state?.key === key && state.error && <p className="py-12 text-center text-red-600">{state.error}</p>}
      {items && items.length === 0 && <p className="py-12 text-center text-gray-500">Chưa có dữ liệu trong khoảng thời gian này.</p>}

      {first && (
        <Link to={`/truyen/${first.story.id}`} className="mt-6 flex gap-5 rounded-2xl bg-ink p-5 text-white hover:bg-ink-soft">
          <CoverImage src={first.story.coverUrl} title={first.story.title} book className="aspect-3/4 w-28 shrink-0 sm:w-36" />
          <div className="min-w-0">
            <p className="font-story text-5xl font-bold text-lamp">1</p>
            <h2 className="mt-1 font-story text-2xl font-semibold">{first.story.title}</h2>
            <p className="text-sm text-white/70">{first.story.author}</p>
            <p className="mt-2 text-lamp">{valueText(type, first.value)}</p>
            {first.story.description && <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/75">{first.story.description}</p>}
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <ol className="mt-4 divide-y rounded-xl border bg-white">
          {rest.map((item) => (
            <li key={item.story.id}>
              <Link to={`/truyen/${item.story.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <span className={`w-8 shrink-0 text-center font-story text-2xl font-bold ${item.rank <= 3 ? "text-lamp" : "text-gray-300"}`}>{item.rank}</span>
                <CoverImage src={item.story.coverUrl} title={item.story.title} className="h-16 w-12 shrink-0 rounded-sm" small />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-story font-semibold">{item.story.title}</p>
                  <p className="truncate text-xs text-gray-500">{item.story.author}, {item.story.genres.map((g) => g.name).join(", ")}</p>
                  {item.story.ratingCount ? <Stars value={item.story.ratingAverage ?? 0} size={12} /> : null}
                </div>
                <span className="shrink-0 text-right text-sm text-gray-700">{valueText(type, item.value)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
