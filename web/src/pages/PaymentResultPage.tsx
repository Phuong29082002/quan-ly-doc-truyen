import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getErrorMessage } from "../api/client";
import { paymentApi, type Transaction } from "../api/payments";
import { formatDateTime, formatPrice } from "../utils/format";

// Kết quả thanh toán (cổng giả lập hoặc VNPay chuyển về)
export default function PaymentResultPage() {
  const id = Number(useParams().id);
  const [reload, setReload] = useState(0);
  const key = `${id}-${reload}`;
  const [state, setState] = useState<{ key: string; data?: Transaction; error?: string }>();

  useEffect(() => {
    let ignore = false;
    paymentApi
      .get(id)
      .then((data) => !ignore && setState({ key, data }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err, "Không tìm thấy giao dịch") }));
    return () => {
      ignore = true;
    };
  }, [key, id]);

  if (state?.key !== key) return <p className="py-12 text-center text-gray-500">Đang kiểm tra kết quả...</p>;
  if (state.error || !state.data) return <p className="py-12 text-center text-red-600">{state.error}</p>;

  const t = state.data;
  const item = t.type === "Package" ? `Gói đọc ${t.packageName}` : `Truyện ${t.storyTitle}`;

  const view = {
    Success: { icon: "✓", color: "bg-green-100 text-green-700", title: "Thanh toán thành công" },
    Failed: { icon: "✕", color: "bg-red-100 text-red-700", title: "Thanh toán không thành công" },
    Pending: { icon: "…", color: "bg-amber-100 text-amber-700", title: "Giao dịch đang chờ xử lý" },
  }[t.status];

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${view.color}`}>{view.icon}</div>
      <h1 className="mt-4 text-xl font-bold">{view.title}</h1>
      <p className="mt-1 text-sm text-gray-600">{item} · {formatPrice(t.amount)}</p>
      <p className="mt-1 text-xs text-gray-400">Mã giao dịch #{t.id}{t.paidAt ? ` · ${formatDateTime(t.paidAt)}` : ""}</p>

      {t.status === "Success" && t.type === "Package" && t.packageEndAt && (
        <p className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800">
          {t.isRenewal ? "Đã gia hạn gói, thời gian được cộng dồn. " : "Gói đã được kích hoạt. "}
          Hạn sử dụng đến <b>{formatDateTime(t.packageEndAt)}</b>.
        </p>
      )}
      {t.status === "Failed" && (
        <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">Bạn chưa bị trừ tiền và chưa được cấp quyền đọc. Vui lòng thử lại.</p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {t.status === "Pending" && (
          <>
            <button onClick={() => setReload((r) => r + 1)} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">Kiểm tra lại</button>
            <Link to={`/thanh-toan/chuyen-khoan/${t.id}`} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Xem lại mã QR</Link>
          </>
        )}
        {t.storyId && (
          <Link to={`/truyen/${t.storyId}`} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t.status === "Success" ? "Đọc truyện ngay" : "Quay lại truyện"}
          </Link>
        )}
        {t.type === "Package" && (
          <Link to={t.status === "Success" ? "/tai-khoan?tab=tu-sach" : "/goi-doc"} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t.status === "Success" ? "Xem gói của tôi" : "Chọn lại gói"}
          </Link>
        )}
        <Link to="/tai-khoan?tab=lich-su" className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Lịch sử thanh toán</Link>
      </div>
    </div>
  );
}
