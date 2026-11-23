import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getErrorMessage } from "../api/client";
import { paymentApi, type BankQr } from "../api/payments";
import { formatPrice } from "../utils/format";

// Chuyển khoản quét mã VietQR: app ngân hàng / MoMo quét là điền sẵn số tài khoản, số tiền, nội dung
export default function BankTransferPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [state, setState] = useState<{ id: number; data?: BankQr; error?: string }>();
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let ignore = false;
    paymentApi
      .bankQr(id)
      .then((data) => !ignore && setState({ id, data }))
      .catch((err) => !ignore && setState({ id, error: getErrorMessage(err, "Không tải được mã QR") }));
    return () => {
      ignore = true;
    };
  }, [id]);

  // Kiểm tra trạng thái mỗi 4 giây: Admin xác nhận (hoặc SePay báo tiền về) là chuyển sang trang kết quả
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      paymentApi
        .get(id)
        .then((t) => {
          if (t.status !== "Pending") navigate(`/thanh-toan/ket-qua/${id}`, { replace: true });
        })
        .catch(() => {});
    }, 4000);
    return () => window.clearInterval(timer);
  }, [id, navigate]);

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied("");
    }
  }

  if (state?.id !== id) return <p className="py-12 text-center text-gray-500">Đang tạo mã QR...</p>;
  if (state.error || !state.data) return <p className="py-12 text-center text-red-600">{state.error}</p>;

  const q = state.data;
  if (q.status !== "Pending") {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">Giao dịch này đã được xử lý.</p>
        <Link to={`/thanh-toan/ket-qua/${q.transactionId}`} className="mt-3 inline-block text-blue-600 underline">Xem kết quả</Link>
      </div>
    );
  }

  const left = Math.max(0, Math.floor((new Date(q.expiresAt).getTime() - now) / 1000));
  const row = (label: string, value: string, copyable = false) => (
    <div className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-2 text-right font-medium">
        {value}
        {copyable && (
          <button onClick={() => copy(label, value)} className="rounded border px-2 py-0.5 text-xs font-normal text-blue-600 hover:bg-blue-50">
            {copied === label ? "Đã chép" : "Chép"}
          </button>
        )}
      </span>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-3xl gap-6 rounded-xl border bg-white p-6 md:grid-cols-2">
      <div className="text-center">
        <img src={q.qrImageUrl} alt="Mã VietQR chuyển khoản" className="mx-auto w-full max-w-xs rounded-lg border" />
        <p className="mt-2 text-xs text-gray-500">Mở app ngân hàng hoặc MoMo, chọn Quét mã QR</p>
      </div>

      <div>
        <h1 className="text-xl font-bold">Chuyển khoản quét mã QR</h1>
        <p className="mt-1 text-sm text-gray-600">Mã giao dịch #{q.transactionId}</p>

        <div className="mt-4">
          {row("Ngân hàng", q.bankName || "—")}
          {row("Số tài khoản", q.accountNo, true)}
          {row("Chủ tài khoản", q.accountName)}
          {row("Số tiền", formatPrice(q.amount))}
          {row("Nội dung", q.transferContent, true)}
        </div>

        <p className="mt-4 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Giữ nguyên nội dung <b>{q.transferContent}</b> để hệ thống nhận ra giao dịch của bạn.
          Sau khi tiền về, gói đọc / truyện sẽ được mở tự động.
        </p>

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
          Đang chờ xác nhận thanh toán
          {left > 0 && <span className="ml-auto font-mono">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>}
        </div>
        {left === 0 && <p className="mt-2 text-xs text-red-600">Mã QR đã quá thời gian khuyến nghị. Nếu đã chuyển khoản, vui lòng chờ quản trị viên xác nhận.</p>}

        <div className="mt-5 flex gap-2">
          <Link to="/tai-khoan?tab=lich-su" className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Lịch sử thanh toán</Link>
        </div>
      </div>
    </div>
  );
}
