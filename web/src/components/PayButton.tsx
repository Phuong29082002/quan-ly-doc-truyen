import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { getErrorMessage } from "../api/client";
import { paymentApi, type PaymentProvider, type PaymentProviders } from "../api/payments";
import { useAuth } from "../auth/useAuth";
import { formatPrice } from "../utils/format";

interface Props {
  kind: "package" | "story";
  /** Id gói đọc hoặc Id truyện */
  targetId: number;
  /** Tên gói / tên truyện hiện trong hộp xác nhận */
  itemName: string;
  amount: number;
  label: string;
  className?: string;
}

// PB19, PB20, PB21, PB45: chọn cổng thanh toán rồi chuyển sang trang thanh toán
export default function PayButton({ kind, targetId, itemName, amount, label, className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<PaymentProviders | null>(null);
  const [provider, setProvider] = useState<PaymentProvider>("Mock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openDialog() {
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setError("");
    setOpen(true);
    try {
      const p = await paymentApi.providers();
      setProviders(p);
      setProvider(p.bankQr ? "BankQR" : p.mock ? "Mock" : "VNPay");
    } catch (err) {
      setError(getErrorMessage(err, "Không tải được cổng thanh toán"));
    }
  }

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = kind === "package" ? await paymentApi.payPackage(targetId, provider) : await paymentApi.payStory(targetId, provider);
      if (res.paymentUrl) {
        // VNPay: rời trang web sang cổng thanh toán, VNPay sẽ đưa người dùng về trang kết quả
        window.location.href = res.paymentUrl;
      } else if (res.provider === "BankQR") {
        navigate(`/thanh-toan/chuyen-khoan/${res.transactionId}`);
      } else {
        navigate(`/thanh-toan/gia-lap/${res.transactionId}`);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Không tạo được giao dịch"));
      setBusy(false);
    }
  }

  const option = (value: PaymentProvider, title: string, note: string, enabled: boolean) => (
    <label className={`flex gap-3 rounded border p-3 ${enabled ? "cursor-pointer hover:bg-gray-50" : "opacity-50"} ${provider === value && enabled ? "border-blue-500 bg-blue-50" : ""}`}>
      <input type="radio" name="provider" disabled={!enabled} checked={provider === value} onChange={() => setProvider(value)} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-gray-500">{note}</span>
      </span>
    </label>
  );

  return (
    <>
      <button type="button" onClick={openDialog}
        className={className ?? "rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"}>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 text-left text-gray-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Xác nhận thanh toán</h3>
            <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-1 text-sm">
              <dt className="text-gray-500">{kind === "package" ? "Gói đọc" : "Truyện"}</dt>
              <dd className="font-medium">{itemName}</dd>
              <dt className="text-gray-500">Số tiền</dt>
              <dd className="font-semibold text-blue-600">{formatPrice(amount)}</dd>
            </dl>

            <p className="mb-2 mt-4 text-sm font-medium">Chọn cổng thanh toán</p>
            {!providers && !error && <p className="text-sm text-gray-500">Đang tải...</p>}
            {providers && (
              <div className="space-y-2">
                {option("BankQR", "Chuyển khoản quét mã QR", providers.bankQr ? "Quét bằng app ngân hàng hoặc MoMo (VietQR)" : "Chưa cấu hình tài khoản nhận tiền", providers.bankQr)}
                {option("VNPay", "VNPay (môi trường thử nghiệm Sandbox)", providers.vnPay ? "Thanh toán bằng thẻ ATM / QR qua VNPay" : "Chưa cấu hình mã VNPay trên máy chủ", providers.vnPay)}
                {option("Mock", "Cổng thanh toán giả lập", "Dùng để demo: tự chọn kết quả thành công hoặc thất bại", providers.mock)}
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button>
              <button type="button" disabled={busy || !providers} onClick={pay}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {busy ? "Đang tạo giao dịch..." : "Thanh toán"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
