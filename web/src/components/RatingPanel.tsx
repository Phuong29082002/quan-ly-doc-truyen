import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getErrorMessage } from "../api/client";
import { ratingApi, type RatingSummary } from "../api/discovery";
import { useAuth } from "../auth/useAuth";
import Stars from "./Stars";

const LABELS = ["Rất tệ", "Chưa hay", "Tạm được", "Hay", "Tuyệt vời"];

// PB49: điểm trung bình, phân bố số sao và chấm điểm (mỗi người một lần, chấm lại thì sửa)
export default function RatingPanel({ storyId }: { storyId: number }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const key = `${storyId}-${user?.id ?? 0}`;
  const [state, setState] = useState<{ key: string; data: RatingSummary }>();
  const [hover, setHover] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    ratingApi.get(storyId).then((data) => !ignore && setState({ key, data })).catch(() => {});
    return () => {
      ignore = true;
    };
  }, [key, storyId]);

  const data = state?.key === key ? state.data : undefined;

  async function rate(score: number) {
    if (!user) {
      navigate("/login", { state: { from: `/truyen/${storyId}` } });
      return;
    }
    setError("");
    try {
      const next = data?.myScore === score ? await ratingApi.remove(storyId) : await ratingApi.rate(storyId, score);
      setState({ key, data: next });
    } catch (err) {
      setError(getErrorMessage(err, "Không lưu được đánh giá"));
    }
  }

  if (!data) return <div className="h-48 rounded-xl border bg-white" />;
  const shown = hover || data.myScore || 0;
  const max = Math.max(1, ...data.distribution);

  return (
    <section className="rounded-xl border bg-white p-5">
      <h2 className="font-story text-lg font-semibold">Đánh giá</h2>
      <div className="mt-3 flex items-center gap-4">
        <div className="text-center">
          <p className="font-story text-4xl font-semibold">{data.count ? data.average.toFixed(1) : "–"}</p>
          <Stars value={data.average} />
          <p className="mt-0.5 text-xs text-gray-500">{data.count} lượt</p>
        </div>
        <ul className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((s) => (
            <li key={s} className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 text-right">{s}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span className="block h-full rounded-full bg-lamp" style={{ width: `${(data.distribution[s - 1] / max) * 100}%` }} />
              </span>
              <span className="w-5 text-right tabular-nums">{data.distribution[s - 1]}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t pt-4">
        <p className="text-sm text-gray-600">{data.myScore ? "Đánh giá của bạn (bấm lại để bỏ)" : "Bạn thấy truyện này thế nào?"}</p>
        <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => rate(s)} onMouseEnter={() => setHover(s)} onFocus={() => setHover(s)} onBlur={() => setHover(0)}
              aria-label={`${s} sao, ${LABELS[s - 1]}`} aria-pressed={data.myScore === s}
              className={`text-2xl leading-none transition-transform hover:scale-110 ${s <= shown ? "text-lamp" : "text-gray-300"}`}>
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">{shown ? LABELS[shown - 1] : ""}</span>
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </section>
  );
}
