import { useEffect, useState, type FormEvent } from "react";
import { getErrorMessage } from "../../api/client";
import {
  adminTransactionApi,
  TRANSACTION_STATUS_LABEL,
  type AdminTransaction,
  type AdminTransactionQuery,
  type TransactionStatus,
} from "../../api/payments";
import type { PagedResult } from "../../api/types";
import Alert from "../../components/Alert";
import Pagination from "../../components/Pagination";
import { formatDateTime, formatPrice } from "../../utils/format";

const STATUS_STYLE: Record<TransactionStatus, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Success: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
};

// PB24: xem giao dịch, đối soát giao dịch thành công nhưng chưa cấp quyền đọc
export default function AdminTransactionsPage() {
  const [query, setQuery] = useState<AdminTransactionQuery>({ page: 1 });
  const [keyword, setKeyword] = useState("");
  const [reload, setReload] = useState(0);
  const key = `${JSON.stringify(query)}|${reload}`;
  const [state, setState] = useState<{ key: string; data?: PagedResult<AdminTransaction>; error?: string }>();
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    adminTransactionApi
      .search(query)
      .then((data) => !ignore && setState({ key, data }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [key, query]);

  function search(e: FormEvent) {
    e.preventDefault();
    setQuery((q) => ({ ...q, keyword: keyword.trim() || undefined, page: 1 }));
  }

  async function grant(t: AdminTransaction) {
    if (!confirm(`Cấp lại quyền đọc "${t.itemName}" cho ${t.displayName} (giao dịch #${t.id})?`)) return;
    setBusyId(t.id);
    setMsg(null);
    try {
      await adminTransactionApi.grant(t.id);
      setMsg({ type: "success", text: `Đã cấp lại quyền đọc cho giao dịch #${t.id}` });
      setReload((r) => r + 1);
    } catch (err) {
      setMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  // Chuyển khoản QR: thấy tiền về tài khoản (đúng nội dung QLDT...) thì xác nhận, không thấy thì hủy
  async function confirmTransfer(t: AdminTransaction, received: boolean) {
    const text = received
      ? `Xác nhận đã nhận ${formatPrice(t.amount)} với nội dung "${t.transferContent}" từ ${t.displayName}?`
      : `Hủy giao dịch #${t.id}? Người dùng sẽ không được cấp quyền đọc.`;
    if (!confirm(text)) return;
    setBusyId(t.id);
    setMsg(null);
    try {
      await adminTransactionApi.confirm(t.id, received);
      setMsg({ type: "success", text: received ? `Đã xác nhận giao dịch #${t.id}, người dùng đã được cấp quyền đọc` : `Đã hủy giao dịch #${t.id}` });
      setReload((r) => r + 1);
    } catch (err) {
      setMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  const data = state?.key === key ? state.data : undefined;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Giao dịch</h1>
      <p className="mb-4 text-sm text-gray-600">
        Chuyển khoản QR: đối chiếu nội dung "QLDT + mã giao dịch" trong app ngân hàng rồi bấm "Đã nhận tiền".
        Đối soát: lọc "lệch quyền đọc" để tìm giao dịch đã thanh toán thành công nhưng chưa được cấp quyền, rồi bấm "Cấp lại quyền".
      </p>

      <form onSubmit={search} className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3 text-sm">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tên đăng nhập, gói, truyện..."
          className="w-60 rounded border px-3 py-1.5" />
        <select value={query.status ?? ""} className="rounded border px-2 py-1.5"
          onChange={(e) => setQuery((q) => ({ ...q, status: (e.target.value || undefined) as TransactionStatus | undefined, page: 1 }))}>
          <option value="">Mọi trạng thái</option>
          <option value="Success">Thành công</option>
          <option value="Pending">Đang chờ</option>
          <option value="Failed">Thất bại</option>
        </select>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={!!query.missingRights}
            onChange={(e) => setQuery((q) => ({ ...q, missingRights: e.target.checked || undefined, page: 1 }))} />
          Chỉ giao dịch lệch quyền đọc
        </label>
        <button className="rounded bg-blue-600 px-4 py-1.5 font-medium text-white">Lọc</button>
      </form>

      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      {state?.key === key && state.error && <Alert>{state.error}</Alert>}
      {!data && !state?.error && <p className="text-gray-500">Đang tải...</p>}

      {data && (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">Mã</th>
                  <th className="px-3 py-2">Thành viên</th>
                  <th className="px-3 py-2">Nội dung</th>
                  <th className="px-3 py-2 text-right">Số tiền</th>
                  <th className="px-3 py-2">Thời gian</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Không có giao dịch phù hợp</td></tr>
                )}
                {data.items.map((t) => (
                  <tr key={t.id} className={`border-t ${t.missingRights ? "bg-red-50" : ""}`}>
                    <td className="px-3 py-2 font-mono">#{t.id}</td>
                    <td className="px-3 py-2">{t.displayName}<span className="block text-xs text-gray-500">{t.username}</span></td>
                    <td className="px-3 py-2">
                      {t.type === "Package" ? "Gói" : "Truyện"}: {t.itemName}
                      <span className="block font-mono text-xs text-gray-500">ND: {t.transferContent}</span>
                    </td>
                    <td className="px-3 py-2 text-right">{formatPrice(t.amount)}</td>
                    <td className="px-3 py-2 text-xs">{formatDateTime(t.paidAt ?? t.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[t.status]}`}>{TRANSACTION_STATUS_LABEL[t.status]}</span>
                      {t.missingRights && <span className="mt-1 block text-xs font-medium text-red-600">Chưa cấp quyền đọc</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {t.status === "Pending" && (
                        <div className="flex justify-end gap-1">
                          <button disabled={busyId === t.id} onClick={() => confirmTransfer(t, true)}
                            className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60">
                            Đã nhận tiền
                          </button>
                          <button disabled={busyId === t.id} onClick={() => confirmTransfer(t, false)}
                            className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                            Hủy
                          </button>
                        </div>
                      )}
                      {t.missingRights && (
                        <button disabled={busyId === t.id} onClick={() => grant(t)}
                          className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60">
                          Cấp lại quyền
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setQuery((q) => ({ ...q, page }))} />
        </>
      )}
    </div>
  );
}
