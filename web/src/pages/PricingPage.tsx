import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { packageApi, type PackageItem } from "../api/packages";
import { paymentApi, type PaymentOverview } from "../api/payments";
import { getErrorMessage } from "../api/client";
import { formatPrice, formatDateTime } from "../utils/format";
import { useAuth } from "../auth/useAuth";

export default function PricingPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<{ data?: PackageItem[]; overview?: PaymentOverview; error?: string }>();
  const [restoringId, setRestoringId] = useState<number | null>(null);
  useEffect(() => {
    let ignore = false;
    Promise.all([packageApi.listActive(), paymentApi.history()])
      .then(([data, overview]) => !ignore && setState({ data, overview }))
      .catch(err => !ignore && setState({ error: getErrorMessage(err) }));
    return () => { ignore = true; };
  }, []);
  if (isAdmin) return <Navigate to="/" replace />;
  const active = state?.overview?.packages.find(p => p.isActive);
  const paused = state?.overview?.packages.filter(p => p.isPaused && p.remainingDays > 0) ?? [];

  async function restorePackage(p: PackageItem) {
    if (!user) { navigate("/login", { state: { from: "/goi-doc" } }); return; }
    setRestoringId(p.id);
    try {
      await paymentApi.checkout("Package", p.id, true, "Restore");
      const [data, overview] = await Promise.all([packageApi.listActive(), paymentApi.history()]);
      setState({ data, overview });
    } catch (err) {
      setState(current => ({ ...current, error: getErrorMessage(err) }));
    } finally {
      setRestoringId(null);
    }
  }

  function checkout(p: PackageItem, mode: "Purchase" | "Renew" | "Switch") {
    if (!user) { navigate("/login", { state: { from: "/goi-doc" } }); return; }
    const description = mode === "Renew"
      ? `Gia hạn thêm ${p.durationDays} ngày`
      : mode === "Switch" ? `Chuyển sang gói ${p.name} · ${p.durationDays} ngày mới` : `Gói đọc ${p.durationDays} ngày`;
    navigate("/thanh-toan", { state: { type: "Package", itemId: p.id, itemName: p.name, amount: p.price, description, packageMode: mode } });
  }

  return <div>
    <h1 className="mb-1 text-2xl font-bold">Gói đọc</h1>
    <p className="mb-6 text-sm text-gray-600">Chọn gói đọc phù hợp. Gói chỉ được kích hoạt sau khi xác nhận thanh toán.</p>
    {active && <section className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
      <h2 className="font-semibold text-green-800">Gói đang sử dụng: {active.packageName}</h2>
      <p className="mt-1 text-sm text-green-800">Còn {active.remainingDays} ngày · Hết hạn: {formatDateTime(active.endAt)}</p>
      <p className="mt-2 text-xs text-green-700">Bạn có thể gia hạn gói này hoặc chuyển sang gói khác. Khi chuyển gói, thời gian còn lại của gói hiện tại sẽ được bảo lưu.</p>
    </section>}
    {paused.length > 0 && <section className="mb-6 rounded-lg border bg-amber-50 p-4"><h2 className="font-semibold">Gói đang tạm dừng</h2>{paused.map(p => <p key={`${p.packageId}-${p.startAt}`} className="mt-1 text-sm">{p.packageName}: còn bảo lưu {p.remainingDays} ngày</p>)}</section>}
    {!state && <p className="text-gray-500">Đang tải...</p>}{state?.error && <p className="text-red-600">{state.error}</p>}{state?.data?.length === 0 && <p className="text-gray-500">Hiện chưa có gói đọc nào.</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{state?.data?.map(p => {
      const isCurrent = active?.packageId === p.id;
      const pausedPackage = paused.find(x => x.packageId === p.id);
      const isSwitch = !!active && !isCurrent;
      return <div key={p.id} className={`flex flex-col rounded-lg border bg-white p-5 ${isCurrent ? "border-green-400" : ""}`}>
        <h2 className="text-lg font-semibold">{p.name}</h2><p className="mt-2 text-3xl font-bold text-blue-600">{formatPrice(p.price)}</p><p className="text-sm text-gray-500">cho {p.durationDays} ngày</p>
        <p className="mt-4 flex-1 text-sm text-gray-700">{p.scope === "All" ? "Đọc tất cả truyện trả phí trên hệ thống." : `Đọc các truyện: ${p.stories.map(s => s.title).join(", ")}.`}</p>
        {isCurrent ? <><p className="mt-4 text-sm font-medium text-green-700">Bạn đang sử dụng gói này</p><button onClick={() => checkout(p, "Renew")} className="mt-2 rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">Gia hạn gói</button></> : pausedPackage ? <button onClick={() => restorePackage(p)} disabled={restoringId !== null} className="mt-5 rounded bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">{restoringId === p.id ? "Đang khôi phục..." : `Khôi phục miễn phí · ${pausedPackage.remainingDays} ngày`}</button> : <button onClick={() => checkout(p, isSwitch ? "Switch" : "Purchase")} className="mt-5 rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">{isSwitch ? "Chuyển sang gói này" : "Chọn gói"}</button>}
      </div>;
    })}</div>
  </div>;
}
