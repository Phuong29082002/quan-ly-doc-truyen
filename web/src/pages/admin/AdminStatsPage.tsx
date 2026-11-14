import { useEffect, useState } from "react";
import { getErrorMessage } from "../../api/client";
import { statsApi, type Stats } from "../../api/discovery";
import Alert from "../../components/Alert";
import DailyBars from "../../components/charts/DailyBars";
import RankBars from "../../components/charts/RankBars";
import { formatNumber, formatPrice } from "../../utils/format";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));
const dm = (s: string) => s.split("-").reverse().slice(0, 2).join("/");

const PRESETS = [
  { label: "7 ngày", days: 6 },
  { label: "30 ngày", days: 29 },
  { label: "90 ngày", days: 89 },
];

const STATUS_LABEL = { Success: "Thành công", Pending: "Đang chờ", Failed: "Thất bại" } as const;

// PB35, PB36, PB37: thống kê theo khoảng thời gian; PB54: xuất Excel
export default function AdminStatsPage() {
  const [range, setRange] = useState({ from: daysAgo(29), to: daysAgo(0) });
  const key = `${range.from}|${range.to}`;
  const [state, setState] = useState<{ key: string; data?: Stats; error?: string }>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    let ignore = false;
    statsApi
      .get(range.from, range.to)
      .then((data) => !ignore && setState({ key, data }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err, "Không tải được thống kê") }));
    return () => {
      ignore = true;
    };
  }, [key, range.from, range.to]);

  async function exportExcel() {
    setExporting(true);
    setExportError("");
    try {
      await statsApi.export(range.from, range.to);
    } catch (err) {
      setExportError(getErrorMessage(err, "Không xuất được file Excel"));
    } finally {
      setExporting(false);
    }
  }

  const s = state?.key === key ? state.data : undefined;
  const t = s?.totals;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="mr-auto text-2xl font-bold">Thống kê</h1>
        <div className="flex gap-1">
          {PRESETS.map((p) => {
            const on = range.from === daysAgo(p.days) && range.to === daysAgo(0);
            return (
              <button key={p.days} onClick={() => setRange({ from: daysAgo(p.days), to: daysAgo(0) })} aria-pressed={on}
                className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-ink text-white" : "border bg-white hover:bg-gray-50"}`}>{p.label}</button>
            );
          })}
        </div>
        <label className="text-sm text-gray-600">Từ <input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} className="ml-1 rounded border px-2 py-1" /></label>
        <label className="text-sm text-gray-600">Đến <input type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} className="ml-1 rounded border px-2 py-1" /></label>
        <button onClick={exportExcel} disabled={exporting} className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {exporting ? "Đang xuất…" : "Xuất Excel"}
        </button>
      </div>
      {exportError && <div className="mt-3"><Alert>{exportError}</Alert></div>}

      {state?.key !== key && <p className="py-12 text-center text-gray-500">Đang tải…</p>}
      {state?.key === key && state.error && <div className="mt-4"><Alert>{state.error}</Alert></div>}

      {s && t && (
        <div className="mt-5 space-y-6">
          {/* PB36: doanh thu là con số chính */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-ink p-4 text-white sm:col-span-2 lg:col-span-1">
              <p className="text-sm text-white/70">Doanh thu</p>
              <p className="mt-1 font-story text-3xl font-semibold">{formatPrice(t.revenue)}</p>
              <p className="mt-1 text-xs text-white/60">{t.successTransactions} giao dịch thành công</p>
            </div>
            <Tile label="Lượt đọc" value={formatNumber(t.views)} note={`${t.activeMembers} thành viên có đọc`} />
            <Tile label="Thành viên" value={formatNumber(t.members)} note={`${t.newMembers} người mới trong kỳ`} />
            <Tile label="Gói đang còn hạn" value={formatNumber(t.activePackages)} note={`${t.stories} truyện, ${t.chapters} chương`} />
          </section>

          {/* PB35: đăng ký gói, gia hạn, mua truyện, trạng thái giao dịch */}
          <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Small label="Đăng ký gói" value={t.packageSubscriptions} />
            <Small label="Gia hạn gói" value={t.packageRenewals} />
            <Small label="Mua truyện" value={t.storyPurchases} />
            <Small label="Giao dịch đang chờ" value={t.pendingTransactions} />
            <Small label="Giao dịch thất bại" value={t.failedTransactions} />
            <Small label="Theo dõi, bình luận mới" value={`${t.newFollows}, ${t.newComments}`} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <DailyBars title="Doanh thu theo ngày" points={s.daily.map((d) => ({ label: dm(d.date), value: d.revenue }))} format={formatPrice} />
            <DailyBars title="Lượt đọc theo ngày" points={s.daily.map((d) => ({ label: dm(d.date), value: d.views }))} format={formatNumber} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <RankBars title="Doanh thu theo gói" format={formatPrice} empty="Chưa có giao dịch gói trong kỳ"
              items={s.revenueByPackage.map((r) => ({ name: r.name, value: r.revenue, note: `${r.count} lượt` }))} />
            <RankBars title="Doanh thu bán truyện" format={formatPrice} empty="Chưa bán truyện nào trong kỳ"
              items={s.revenueByStory.map((r) => ({ name: r.name, value: r.revenue, note: `${r.count} lượt` }))} />
            <RankBars title="Thể loại được đọc nhiều" format={formatNumber} empty="Chưa có lượt đọc"
              items={s.genres.filter((g) => g.views > 0).slice(0, 8).map((g) => ({ name: g.name, value: g.views, note: `${g.stories} truyện` }))} />
          </div>

          {/* PB37: nội dung nổi bật */}
          <section className="overflow-x-auto rounded-xl border bg-white">
            <h3 className="px-4 pt-4 font-medium">Truyện đọc nhiều trong kỳ</h3>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr className="border-b">
                  <th className="px-4 py-2 font-medium">Hạng</th>
                  <th className="px-4 py-2 font-medium">Truyện</th>
                  <th className="px-4 py-2 text-right font-medium">Lượt đọc</th>
                  <th className="px-4 py-2 text-right font-medium">Theo dõi</th>
                  <th className="px-4 py-2 text-right font-medium">Mua trong kỳ</th>
                  <th className="px-4 py-2 text-right font-medium">Đánh giá</th>
                </tr>
              </thead>
              <tbody>
                {s.topStories.map((c, i) => (
                  <tr key={c.storyId} className="border-b last:border-0">
                    <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2">{c.title}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatNumber(c.views)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatNumber(c.follows)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatNumber(c.purchases)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.ratingCount ? `${c.ratingAverage.toFixed(1)} (${c.ratingCount})` : "–"}</td>
                  </tr>
                ))}
                {s.topStories.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Chưa có lượt đọc trong kỳ</td></tr>}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border bg-white p-4">
            <h3 className="font-medium">Trạng thái giao dịch trong kỳ</h3>
            <ul className="mt-2 flex flex-wrap gap-6 text-sm">
              {s.transactionStatuses.map((x) => (
                <li key={x.status}><span className="text-gray-500">{STATUS_LABEL[x.status]}:</span> <b>{x.count}</b> giao dịch, {formatPrice(x.amount)}</li>
              ))}
              {s.transactionStatuses.length === 0 && <li className="text-gray-500">Không có giao dịch</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-story text-3xl font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </div>
  );
}

function Small({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</p>
    </div>
  );
}
