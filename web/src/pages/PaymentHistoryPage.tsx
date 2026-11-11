import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { paymentApi, type PaymentOverview } from "../api/payments";
import { getErrorMessage } from "../api/client";
import { formatDateTime, formatPrice } from "../utils/format";

export default function PaymentHistoryPage() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState<PaymentOverview>(); const [error, setError] = useState("");
  useEffect(() => { if (!isAdmin) paymentApi.history().then(setData).catch(e => setError(getErrorMessage(e))); }, [isAdmin]);
  if (isAdmin) return <Navigate to="/" replace />;
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Lịch sử thanh toán và quyền đọc</h1>
    {error && <p className="text-red-600">{error}</p>}{!data && !error && <p>Đang tải...</p>}
    {data && <>
      <section className="rounded-lg border bg-white p-5"><h2 className="mb-3 text-lg font-semibold">Gói đọc</h2>{data.packages.length ? <div className="space-y-2">{data.packages.map((p,i)=><div key={i} className="flex flex-wrap justify-between border-b py-2 text-sm"><span>{p.packageName} {p.isActive && <b className="text-green-600">Đang sử dụng · còn {p.remainingDays} ngày</b>}{p.isPaused && <b className="text-amber-600">Tạm dừng · bảo lưu {p.remainingDays} ngày</b>}{!p.isActive && !p.isPaused && <b className="text-gray-500">Đã hết hạn</b>}</span><span>{formatDateTime(p.startAt)} – {formatDateTime(p.endAt)}</span></div>)}</div> : <p className="text-sm text-gray-500">Chưa đăng ký gói đọc.</p>}</section>
      <section className="rounded-lg border bg-white p-5"><h2 className="mb-3 text-lg font-semibold">Truyện đã mua</h2>{data.purchasedStories.length ? data.purchasedStories.map(s=><div key={s.storyId} className="flex justify-between border-b py-2 text-sm"><Link className="text-blue-600 hover:underline" to={`/truyen/${s.storyId}`}>{s.title}</Link><span>{formatPrice(s.price)}</span></div>) : <p className="text-sm text-gray-500">Chưa mua truyện riêng.</p>}</section>
      <section className="rounded-lg border bg-white p-5"><h2 className="mb-3 text-lg font-semibold">Giao dịch</h2>{data.transactions.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Mã</th><th className="p-2">Nội dung</th><th className="p-2">Số tiền</th><th className="p-2">Trạng thái</th><th className="p-2">Thời gian</th></tr></thead><tbody>{data.transactions.map(t=><tr key={t.id} className="border-b"><td className="p-2">#{t.id}</td><td className="p-2">{t.itemName ?? t.type}</td><td className="p-2">{formatPrice(t.amount)}</td><td className={`p-2 ${t.status === "Success" ? "text-green-600" : t.status === "Failed" ? "text-red-600" : "text-amber-600"}`}>{t.status === "Success" ? "Thành công" : t.status === "Failed" ? "Thất bại" : "Đang xử lý"}</td><td className="p-2">{formatDateTime(t.createdAt)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-gray-500">Chưa có giao dịch.</p>}</section>
    </>}
  </div>;
}
