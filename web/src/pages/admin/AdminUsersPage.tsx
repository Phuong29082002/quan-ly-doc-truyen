import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "../../api/client";
import { adminUserApi, USER_STATUS_LABEL, type AdminUser, type AdminUserDetail, type UserStatus } from "../../api/community";
import { transactionLabel } from "../../api/payments";
import type { PagedResult } from "../../api/types";
import Alert from "../../components/Alert";
import Avatar from "../../components/Avatar";
import Pagination from "../../components/Pagination";
import { formatDate, formatDateTime, formatPrice, timeAgo } from "../../utils/format";

const STATUS_STYLE: Record<UserStatus, string> = {
  Active: "bg-green-100 text-green-700",
  Restricted: "bg-amber-100 text-amber-800",
  Suspended: "bg-red-100 text-red-700",
};

// PB33: danh sách thành viên và thông tin sử dụng dịch vụ; PB34: hạn chế / tạm ngừng tài khoản
export default function AdminUsersPage() {
  const [query, setQuery] = useState<{ keyword?: string; status?: UserStatus; page: number }>({ page: 1 });
  const [keyword, setKeyword] = useState("");
  const [reload, setReload] = useState(0);
  const key = `${JSON.stringify(query)}|${reload}`;
  const [state, setState] = useState<{ key: string; data?: PagedResult<AdminUser>; error?: string }>();
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    adminUserApi
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

  const data = state?.key === key ? state.data : undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold">Thành viên</h1>
      <form onSubmit={search} className="my-4 flex flex-wrap gap-2">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tên đăng nhập, email, tên hiển thị" className="min-w-64 flex-1 rounded border px-3 py-1.5 text-sm" />
        <select value={query.status ?? ""} onChange={(e) => setQuery((q) => ({ ...q, status: (e.target.value || undefined) as UserStatus | undefined, page: 1 }))}
          className="rounded border bg-white px-2 py-1.5 text-sm">
          <option value="">Mọi trạng thái</option>
          {(Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((s) => <option key={s} value={s}>{USER_STATUS_LABEL[s]}</option>)}
        </select>
        <button className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white">Tìm</button>
      </form>
      {state?.key === key && state.error && <Alert>{state.error}</Alert>}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Thành viên</th>
              <th className="px-3 py-2 font-medium">Trạng thái</th>
              <th className="px-3 py-2 font-medium">Gói đang dùng</th>
              <th className="px-3 py-2 text-right font-medium">Truyện đã mua</th>
              <th className="px-3 py-2 text-right font-medium">Đã chi</th>
              <th className="px-3 py-2 font-medium">Đọc gần nhất</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((u) => (
              <tr key={u.id} onClick={() => setSelected(u.id)} className="cursor-pointer border-t hover:bg-blue-50/50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar url={u.avatarUrl} name={u.displayName} size={30} />
                    <div className="min-w-0">
                      <button className="block truncate text-left font-medium hover:text-blue-700">{u.displayName}</button>
                      <p className="truncate text-xs text-gray-500">@{u.username}{u.role === "Admin" ? ", quản trị" : ""}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[u.status]}`}>{USER_STATUS_LABEL[u.status]}</span></td>
                <td className="px-3 py-2">{u.activePackage ? <>{u.activePackage}<p className="text-xs text-gray-500">đến {formatDate(u.activePackageEndAt!)}</p></> : <span className="text-gray-400">Không</span>}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.purchasedStories}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPrice(u.totalPaid)}</td>
                <td className="px-3 py-2 text-gray-600">{u.lastReadAt ? timeAgo(u.lastReadAt) : "–"}</td>
              </tr>
            ))}
            {data?.items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Không có thành viên phù hợp</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setQuery((q) => ({ ...q, page: p }))} />}

      {selected !== null && <UserDrawer id={selected} onClose={() => setSelected(null)} onChanged={() => setReload((x) => x + 1)} />}
    </div>
  );
}

function UserDrawer({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [version, setVersion] = useState(0);
  const key = `${id}|${version}`;
  const [state, setState] = useState<{ key: string; data?: AdminUserDetail; error?: string }>();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    adminUserApi
      .detail(id)
      .then((data) => !ignore && setState({ key, data }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [key, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const d = state?.key === key ? state.data : undefined;
  const current = d?.user.status;
  const target = status ?? current;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!d || !target || target === current) return;
    if (target !== "Active" && !reason.trim()) {
      setMsg({ type: "error", text: "Vui lòng nhập lý do để thành viên biết vì sao bị xử lý" });
      return;
    }
    try {
      await adminUserApi.setStatus(d.user.id, target, reason.trim() || undefined);
      setMsg({ type: "success", text: `Đã chuyển sang "${USER_STATUS_LABEL[target]}"` });
      setStatus(null);
      setReason("");
      setVersion((v) => v + 1);
      onChanged();
    } catch (err) {
      setMsg({ type: "error", text: getErrorMessage(err) });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Thông tin thành viên" onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl">
        <button onClick={onClose} className="float-right rounded-full px-3 py-1 text-sm text-gray-500 hover:bg-gray-100">Đóng</button>
        {!d && !state?.error && <p className="text-gray-500">Đang tải…</p>}
        {state?.error && <Alert>{state.error}</Alert>}
        {d && (
          <>
            <div className="flex items-center gap-3">
              <Avatar url={d.user.avatarUrl} name={d.user.displayName} size={48} />
              <div>
                <h2 className="text-lg font-semibold">{d.user.displayName}</h2>
                <p className="text-sm text-gray-500">@{d.user.username}, {d.user.email}</p>
                <p className="text-xs text-gray-500">Tham gia {formatDate(d.user.createdAt)}, {d.user.commentCount} bình luận, bị báo cáo {d.reportsAgainst} lần</p>
              </div>
            </div>

            {d.user.role !== "Admin" && (
              <form onSubmit={save} className="mt-5 rounded-lg border p-4">
                <p className="text-sm font-medium">Trạng thái tài khoản</p>
                {d.user.statusReason && current !== "Active" && <p className="mt-1 text-xs text-gray-500">Lý do hiện tại: {d.user.statusReason}</p>}
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((s) => (
                    <label key={s} className={`cursor-pointer rounded-lg border p-2 text-sm ${target === s ? "border-blue-600 bg-blue-50" : ""}`}>
                      <input type="radio" name="status" className="sr-only" checked={target === s} onChange={() => setStatus(s)} />
                      <span className="font-medium">{USER_STATUS_LABEL[s]}</span>
                      <span className="block text-xs text-gray-500">
                        {s === "Active" ? "Dùng bình thường" : s === "Restricted" ? "Đọc được, không bình luận" : "Không đăng nhập được"}
                      </span>
                    </label>
                  ))}
                </div>
                {target !== current && target !== "Active" && (
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={2} placeholder="Lý do (thành viên sẽ thấy)"
                    className="mt-2 w-full rounded border px-2 py-1.5 text-sm" />
                )}
                {msg && <div className="mt-2"><Alert type={msg.type}>{msg.text}</Alert></div>}
                <button disabled={target === current} className="mt-2 rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-40">Lưu trạng thái</button>
              </form>
            )}

            <Section title="Gói và mua truyện">
              <p className="text-sm">{d.user.activePackage ? `${d.user.activePackage}, hết hạn ${formatDate(d.user.activePackageEndAt!)}` : "Không có gói còn hạn"}</p>
              <p className="text-sm text-gray-600">{d.user.purchasedStories} truyện đã mua, tổng chi {formatPrice(d.user.totalPaid)}</p>
            </Section>

            <Section title="Giao dịch gần đây">
              {d.recentTransactions.length === 0 ? <p className="text-sm text-gray-500">Chưa có</p> : (
                <ul className="divide-y text-sm">
                  {d.recentTransactions.map((t) => (
                    <li key={t.id} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate">#{t.id} {transactionLabel(t)}</span>
                      <span className="shrink-0 text-gray-600">{formatPrice(t.amount)}, {t.status === "Success" ? "thành công" : t.status === "Pending" ? "đang chờ" : "thất bại"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Đang đọc">
              {d.reading.length === 0 ? <p className="text-sm text-gray-500">Chưa đọc truyện nào</p> : (
                <ul className="space-y-1 text-sm">
                  {d.reading.map((r) => (
                    <li key={r.storyId}><Link to={`/truyen/${r.storyId}`} className="text-blue-700 hover:underline">{r.storyTitle}</Link>, chương {r.chapterNumber}/{r.totalChapters} <span className="text-xs text-gray-500">({formatDateTime(r.updatedAt)})</span></li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Theo dõi">
              {d.follows.length === 0 ? <p className="text-sm text-gray-500">Không theo dõi truyện nào</p> : <p className="text-sm">{d.follows.map((f) => f.title).join(", ")}</p>}
            </Section>
          </>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-1.5 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </section>
  );
}
