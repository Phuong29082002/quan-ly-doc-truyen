import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { paymentApi } from "../api/payments";
import { getErrorMessage } from "../api/client";
import { formatPrice } from "../utils/format";
import { useAuth } from "../auth/useAuth";

type CheckoutState = {
  type: "Package" | "Story";
  itemId: number;
  itemName: string;
  amount: number;
  description: string;
  packageMode?: "Purchase" | "Renew" | "Switch";
};

const qrRows = [
  "111111100100101111111", "100000101011001000001", "101110101101101011101", "101110100010101011101", "101110101110101011101", "100000101001001000001", "111111101010101111111",
  "000000001101100000000", "110101111010111010110", "001011001111000101001", "111100111001101110100", "010011000111011001110", "101101111000110100011", "000000001011001011010",
  "111111101100111010101", "100000100011010110010", "101110101110101011101", "101110100101011001100", "101110101011100111011", "100000101100011000101", "111111101011101101110",
];

function DemoQr() {
  return <svg viewBox="0 0 210 210" role="img" aria-label="Mã QR minh họa thanh toán" className="h-56 w-56 rounded bg-white p-2">
    <rect width="210" height="210" fill="white" />
    {qrRows.map((row, y) => row.split("").map((cell, x) => cell === "1" ? <rect key={`${x}-${y}`} x={x * 10} y={y * 10} width="10" height="10" fill="#111827" /> : null))}
  </svg>;
}

export default function PaymentPage() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const checkout = location.state as CheckoutState | null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  if (isAdmin) return <Navigate to="/" replace />;
  if (!checkout || !user || !["Package", "Story"].includes(checkout.type) || !checkout.itemId) return <Navigate to="/goi-doc" replace />;

  async function confirmPayment() {
    setBusy(true);
    setError("");
    try {
      const result = await paymentApi.checkout(checkout.type, checkout.itemId, true, checkout.packageMode ?? "Purchase");
      if (result.status === "Success") setCompleted(true);
      else setError(result.message || "Thanh toán chưa thành công.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (completed) return <div className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center">
    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">✓</div>
    <h1 className="text-2xl font-bold">Thanh toán thành công</h1>
    <p className="mt-2 text-sm text-gray-600">{checkout.itemName} đã được ghi nhận. Quyền đọc sẽ được cập nhật cho tài khoản của bạn.</p>
    <div className="mt-6 flex justify-center gap-3"><button onClick={() => navigate(checkout.type === "Story" ? `/truyen/${checkout.itemId}` : "/tai-khoan/thanh-toan", { replace: true })} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">{checkout.type === "Story" ? "Quay lại truyện" : "Xem lịch sử thanh toán"}</button><Link to="/" className="rounded border px-4 py-2 text-sm">Trang chủ</Link></div>
  </div>;

  return <div className="mx-auto max-w-4xl">
    <h1 className="mb-2 text-2xl font-bold">Thanh toán</h1>
    <p className="mb-6 text-sm text-gray-600">Quét mã QR minh họa hoặc nhấn nút bên dưới để giả lập thanh toán thành công. Đây không phải mã QR ngân hàng thật.</p>
    <div className="grid gap-6 rounded-xl border bg-white p-5 md:grid-cols-[1fr_300px] md:p-7">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Thông tin thanh toán</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b pb-3"><dt className="text-gray-500">Người mua</dt><dd className="text-right font-medium">{user.displayName}</dd></div>
          <div className="flex justify-between gap-4 border-b pb-3"><dt className="text-gray-500">Tài khoản</dt><dd className="text-right">{user.username} · {user.email}</dd></div>
          <div className="flex justify-between gap-4 border-b pb-3"><dt className="text-gray-500">Nội dung</dt><dd className="text-right font-medium">{checkout.itemName}</dd></div>
          <div className="flex justify-between gap-4 border-b pb-3"><dt className="text-gray-500">Chi tiết</dt><dd className="text-right">{checkout.description}</dd></div>
          <div className="flex justify-between gap-4 border-b pb-3"><dt className="text-gray-500">Loại giao dịch</dt><dd className="text-right">{checkout.type === "Package" ? "Đăng ký gói đọc" : "Mua quyền đọc truyện"}</dd></div>
        </dl>
        {checkout.type === "Package" && checkout.packageMode === "Switch" && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Sau khi thanh toán thành công, gói đang sử dụng sẽ được tạm dừng và bảo lưu số ngày còn lại. Khôi phục gói đã tạm dừng được thực hiện miễn phí ở trang Gói đọc.</p>}
        <div className="mt-5 rounded-lg bg-blue-50 p-4"><p className="text-sm text-blue-800">Số tiền cần thanh toán</p><p className="mt-1 text-3xl font-bold text-blue-700">{formatPrice(checkout.amount)}</p></div>
        {error && <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button onClick={confirmPayment} disabled={busy} className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Đang xử lý thanh toán..." : "Thanh toán"}</button>
        <button onClick={() => navigate(-1)} disabled={busy} className="mt-2 w-full rounded-lg border px-5 py-2.5 text-sm hover:bg-gray-50">Quay lại</button>
      </section>
      <section className="flex flex-col items-center rounded-lg bg-gray-50 p-4 text-center">
        <h2 className="font-semibold">Mã QR thanh toán</h2>
        <div className="mt-3 rounded-lg border bg-white p-2"><DemoQr /></div>
        <p className="mt-3 text-xs text-gray-500">QR minh họa dùng cho demo, không thể quét để chuyển tiền.</p>
        <p className="mt-2 text-xs font-medium text-gray-700">Mã đơn: QDT-{checkout.type}-{checkout.itemId}</p>
      </section>
    </div>
  </div>;
}
