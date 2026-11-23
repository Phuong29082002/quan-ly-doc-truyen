import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getErrorMessage } from "../api/client";
import { paymentApi, type Transaction } from "../api/payments";
import { formatDateTime, formatPrice } from "../utils/format";

// Cổng thanh toán giả lập: dùng khi demo, thay cho trang của ngân hàng / VNPay
export default function MockPaymentPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [state, setState] = useState<{ id: number; data?: Transaction; error?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    paymentApi
      .get(id)
      .then((data) => !ignore && setState({ id, data }))
      .catch((err) => !ignore && setState({ id, error: getErrorMessage(err, "Không tìm thấy giao dịch") }));
    return () => {
      ignore = true;
    };
  }, [id]);

  async function finish(success: boolean) {
    setBusy(true);
    setError("");
    try {
      await paymentApi.mockResult(id, success);
      navigate(`/thanh-toan/ket-qua/${id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  if (state?.id !== id) return <p className="py-12 text-center text-gray-500">Đang tải...</p>;
  if (state.error || !state.data) return <p className="py-12 text-center text-red-600">{state.error}</p>;

  const t = state.data;
  if (t.status !== "Pending") {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Giao dịch này đã được xử lý.</p>
        <Link to={`/thanh-toan/ket-qua/${t.id}`} className="mt-3 inline-block text-blue-600 underline">Xem kết quả</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="bg-linear-to-r from-indigo-600 to-blue-600 px-6 py-4 text-white">
        <p className="text-xs uppercase tracking-wide opacity-80">Cổng thanh toán giả lập</p>
        <p className="mt-1 text-2xl font-bold">{formatPrice(t.amount)}</p>
      </div>
      <div className="p-6">
        <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
          <dt className="text-gray-500">Mã giao dịch</dt>
          <dd className="font-mono">#{t.id}</dd>
          <dt className="text-gray-500">Nội dung</dt>
          <dd>{t.type === "Package" ? `Gói đọc ${t.packageName}` : `Mua truyện ${t.storyTitle}`}</dd>
          <dt className="text-gray-500">Tạo lúc</dt>
          <dd>{formatDateTime(t.createdAt)}</dd>
        </dl>

        <p className="mt-5 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Đây là môi trường thử nghiệm, không trừ tiền thật. Chọn kết quả để kiểm tra cách hệ thống xử lý giao dịch.
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 grid gap-2">
          <button disabled={busy} onClick={() => finish(true)}
            className="rounded bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
            Thanh toán thành công
          </button>
          <button disabled={busy} onClick={() => finish(false)}
            className="rounded border border-red-300 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
            Giả lập thanh toán thất bại
          </button>
        </div>
      </div>
    </div>
  );
}
