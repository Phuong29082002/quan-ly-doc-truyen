import { useState } from "react";

export interface BarPoint {
  label: string;
  value: number;
}

interface Props {
  title: string;
  points: BarPoint[];
  format: (v: number) => string;
  height?: number;
}

// Biểu đồ cột theo ngày (một chuỗi số liệu, một màu); rê chuột hoặc dùng phím Tab để xem giá trị từng ngày
export default function DailyBars({ title, points, format, height = 180 }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((s, p) => s + p.value, 0);
  const ticks = [max, max / 2, 0];
  const step = Math.max(1, Math.ceil(points.length / 8));
  const shown = active !== null ? points[active] : null;

  return (
    <figure className="rounded-xl border bg-white p-4">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-gray-900">{title}</span>
        <span className="text-sm text-gray-500">
          {shown ? <>{shown.label}: <b className="text-gray-900">{format(shown.value)}</b></> : <>Tổng: <b className="text-gray-900">{format(total)}</b></>}
        </span>
      </figcaption>

      <div className="mt-4 flex gap-2">
        <div className="flex flex-col justify-between text-right text-[11px] text-gray-400" style={{ height }}>
          {ticks.map((t, i) => <span key={i} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{format(Math.round(t))}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((_, i) => <span key={i} className="border-t border-gray-100" />)}
          </div>
          <div className="relative flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setActive(null)}>
            {points.map((p, i) => (
              <button key={p.label} type="button" onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                aria-label={`${p.label}: ${format(p.value)}`} className="group flex h-full min-w-0 flex-1 items-end">
                <span className={`block w-full rounded-t-[4px] ${active === i ? "bg-blue-800" : "bg-blue-600"}`}
                  style={{ height: p.value > 0 ? `max(2px, ${(p.value / max) * 100}%)` : 0 }} />
              </button>
            ))}
          </div>
          <div className="mt-1 flex gap-[2px] text-[10px] text-gray-400">
            {points.map((p, i) => (
              <span key={p.label} className="min-w-0 flex-1 overflow-visible whitespace-nowrap">{i % step === 0 ? p.label.slice(0, 5) : ""}</span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
