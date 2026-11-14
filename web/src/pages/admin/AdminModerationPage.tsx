import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "../../api/client";
import { moderationApi, type AdminComment, type CommentReport, type ReportStatus } from "../../api/community";
import type { PagedResult } from "../../api/types";
import Alert from "../../components/Alert";
import Pagination from "../../components/Pagination";
import { formatDateTime } from "../../utils/format";

const REPORT_STATUS: Record<ReportStatus, { label: string; cls: string }> = {
  Pending: { label: "Chờ xử lý", cls: "bg-amber-100 text-amber-800" },
  Resolved: { label: "Đã xử lý", cls: "bg-green-100 text-green-700" },
  Rejected: { label: "Bỏ qua", cls: "bg-gray-100 text-gray-600" },
};

// PB32: xử lý báo cáo vi phạm, ẩn / hiện / xóa bình luận
export default function AdminModerationPage() {
  const [tab, setTab] = useState<"reports" | "comments">("reports");
  return (
    <div>
      <h1 className="text-2xl font-bold">Kiểm duyệt thảo luận</h1>
      <div className="mt-4 flex gap-1 border-b" role="tablist">
        {([["reports", "Báo cáo vi phạm"], ["comments", "Tất cả bình luận"]] as const).map(([v, label]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === v ? "border-blue-600 font-medium text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tab === "reports" ? <Reports /> : <Comments />}</div>
    </div>
  );
}

function Reports() {
  const [status, setStatus] = useState<ReportStatus | "">("Pending");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const key = `${status}|${page}|${reload}`;
  const [state, setState] = useState<{ key: string; data?: PagedResult<CommentReport>; error?: string }>();
  const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    moderationApi
      .reports(status || undefined, page)
      .then((data) => !ignore && setState({ key, data }))
      .catch((err) => !ignore && setState({ key, error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, [key, status, page]);

  async function resolve(r: CommentReport, action: "Hide" | "Delete" | "Reject") {
    if (action === "Delete" && !confirm("Xóa hẳn bình luận này (kèm các trả lời)?")) return;
    setMsg(null);
    try {
      await moderationApi.resolve(r.id, action);
      setMsg({ type: "success", text: action === "Reject" ? "Đã bỏ qua báo cáo" : action === "Hide" ? "Đã ẩn bình luận" : "Đã xóa bình luận" });
      setReload((x) => x + 1);
    } catch (err) {
      setMsg({ type: "error", text: getErrorMessage(err) });
    }
  }

  const data = state?.key === key ? state.data : undefined;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-gray-600">Trạng thái</span>
        <select value={status} onChange={(e) => { setStatus(e.target.value as ReportStatus | ""); setPage(1); }} className="rounded border bg-white px-2 py-1">
          <option value="">Tất cả</option>
          <option value="Pending">Chờ xử lý</option>
          <option value="Resolved">Đã xử lý</option>
          <option value="Rejected">Bỏ qua</option>
        </select>
      </div>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      {state?.key === key && state.error && <Alert>{state.error}</Alert>}
      {data?.items.length === 0 && <p className="rounded-lg border bg-white p-6 text-center text-gray-500">Không có báo cáo nào.</p>}
      <ul className="space-y-3">
        {data?.items.map((r) => (
          <li key={r.id} className="rounded-lg border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className={`rounded px-1.5 py-0.5 font-medium ${REPORT_STATUS[r.status].cls}`}>{REPORT_STATUS[r.status].label}</span>
              <span>{r.reporter} báo cáo: <b className="text-gray-800">{r.reason}</b></span>
              <span>{formatDateTime(r.createdAt)}</span>
              {r.pendingReportsOfComment > 1 && <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700">{r.pendingReportsOfComment} báo cáo đang chờ</span>}
            </div>
            <blockquote className={`mt-2 border-l-4 pl-3 text-sm ${r.commentHidden ? "border-gray-300 text-gray-500" : "border-amber-400 text-gray-900"}`}>
              {r.commentContent || <i>(bình luận đã bị xóa)</i>}
              {r.commentHidden && <span className="ml-2 rounded bg-gray-100 px-1 text-xs">Đang ẩn</span>}
            </blockquote>
            <p className="mt-1 text-xs text-gray-500">
              Của <b>{r.commentAuthor}</b> trong{" "}
              <Link to={`/truyen/${r.storyId}/chuong/${r.chapterNumber}`} className="text-blue-700 hover:underline">{r.storyTitle}, chương {r.chapterNumber}</Link>
            </p>
            {r.status === "Pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => resolve(r, "Hide")} className="rounded bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600">Ẩn bình luận</button>
                <button onClick={() => resolve(r, "Delete")} className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Xóa bình luận</button>
                <button onClick={() => resolve(r, "Reject")} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">Không vi phạm</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}

function Comments() {
  const [query, setQuery] = useState<{ keyword?: string; hidden?: boolean; page: number }>({ page: 1 });
  const [keyword, setKeyword] = useState("");
  const [reload, setReload] = useState(0);
  const key = `${JSON.stringify(query)}|${reload}`;
  const [state, setState] = useState<{ key: string; data?: PagedResult<AdminComment>; error?: string }>();

  useEffect(() => {
    let ignore = false;
    moderationApi
      .comments(query)
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

  async function toggle(c: AdminComment) {
    await moderationApi.setHidden(c.id, !c.isHidden);
    setReload((x) => x + 1);
  }

  async function remove(c: AdminComment) {
    if (!confirm("Xóa bình luận này?")) return;
    await moderationApi.remove(c.id);
    setReload((x) => x + 1);
  }

  const data = state?.key === key ? state.data : undefined;

  return (
    <div>
      <form onSubmit={search} className="mb-3 flex flex-wrap gap-2">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo nội dung, người viết, truyện" className="min-w-64 flex-1 rounded border px-3 py-1.5 text-sm" />
        <select value={query.hidden === undefined ? "" : String(query.hidden)}
          onChange={(e) => setQuery((q) => ({ ...q, hidden: e.target.value === "" ? undefined : e.target.value === "true", page: 1 }))}
          className="rounded border bg-white px-2 py-1.5 text-sm">
          <option value="">Tất cả</option>
          <option value="false">Đang hiện</option>
          <option value="true">Đang ẩn</option>
        </select>
        <button className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white">Tìm</button>
      </form>
      {state?.key === key && state.error && <Alert>{state.error}</Alert>}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Bình luận</th>
              <th className="px-3 py-2 font-medium">Người viết</th>
              <th className="px-3 py-2 font-medium">Vị trí</th>
              <th className="px-3 py-2 font-medium">Báo cáo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((c) => (
              <tr key={c.id} className={`border-t align-top ${c.isHidden ? "bg-gray-50 text-gray-500" : ""}`}>
                <td className="max-w-md px-3 py-2">
                  <p className="line-clamp-3">{c.content}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(c.createdAt)}</p>
                </td>
                <td className="px-3 py-2">{c.displayName}<p className="text-xs text-gray-400">@{c.username}</p></td>
                <td className="px-3 py-2"><Link to={`/truyen/${c.storyId}/chuong/${c.chapterNumber}`} className="text-blue-700 hover:underline">{c.storyTitle}, ch. {c.chapterNumber}</Link></td>
                <td className="px-3 py-2">{c.reportCount || ""}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button onClick={() => toggle(c)} className="rounded border px-2 py-1 text-xs hover:bg-gray-100">{c.isHidden ? "Hiện lại" : "Ẩn"}</button>
                  <button onClick={() => remove(c)} className="ml-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Xóa</button>
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">Không có bình luận phù hợp</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setQuery((q) => ({ ...q, page: p }))} />}
    </div>
  );
}
