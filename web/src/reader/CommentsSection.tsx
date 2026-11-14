import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { getErrorMessage } from "../api/client";
import { commentApi, type ChapterComment } from "../api/community";
import { useAuth } from "../auth/useAuth";
import Avatar from "../components/Avatar";
import { timeAgo } from "../utils/format";

const REPORT_REASONS = ["Spam, quảng cáo", "Ngôn từ xúc phạm", "Tiết lộ nội dung (spoil)", "Nội dung không phù hợp"];

// PB30, PB31: thảo luận theo chương, trả lời một cấp, báo cáo vi phạm
export default function CommentsSection({ chapterId, dark }: { chapterId: number; dark: boolean }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<{ chapterId: number; items?: ChapterComment[]; error?: string }>();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    commentApi
      .list(chapterId)
      .then((items) => !ignore && setState({ chapterId, items }))
      .catch((err) => !ignore && setState({ chapterId, error: getErrorMessage(err, "Không tải được bình luận") }));
    return () => {
      ignore = true;
    };
  }, [chapterId, version]);

  const reload = () => setVersion((v) => v + 1);
  const items = state?.chapterId === chapterId ? state.items : undefined;
  const total = items?.reduce((n, c) => n + 1 + c.replies.length, 0) ?? 0;
  const restricted = user?.status === "Restricted";
  const muted = dark ? "text-gray-400" : "text-gray-500";

  return (
    <section className={`mx-auto mt-8 max-w-3xl rounded-xl border p-5 sm:p-8 ${dark ? "border-gray-700 bg-gray-900 text-gray-200" : "bg-white"}`}>
      <h2 className="font-story text-xl font-semibold">Bình luận {items ? `(${total})` : ""}</h2>

      <div className="mt-4">
        {!user ? (
          <p className={`text-sm ${muted}`}>
            <Link to="/login" state={{ from: location.pathname }} className="text-blue-700 underline">Đăng nhập</Link> để tham gia bình luận.
          </p>
        ) : restricted ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Tài khoản đang bị hạn chế nên không thể bình luận.</p>
        ) : (
          <CommentForm chapterId={chapterId} onDone={reload} dark={dark} placeholder="Bạn nghĩ gì về chương này?" />
        )}
      </div>

      {state?.error && <p className="mt-4 text-sm text-red-600">{state.error}</p>}
      {items && items.length === 0 && <p className={`mt-6 text-sm ${muted}`}>Chưa có bình luận nào. Hãy là người đầu tiên.</p>}

      <ul className="mt-6 space-y-5">
        {items?.map((c) => (
          <li key={c.id}>
            <CommentItem comment={c} chapterId={chapterId} canReply={!!user && !restricted} myId={user?.id} isAdmin={isAdmin} dark={dark} onChanged={reload} />
            {c.replies.length > 0 && (
              <ul className={`ml-11 mt-3 space-y-3 border-l-2 pl-4 ${dark ? "border-gray-700" : "border-gray-100"}`}>
                {c.replies.map((r) => (
                  <li key={r.id}>
                    <CommentItem comment={r} chapterId={chapterId} canReply={false} myId={user?.id} isAdmin={isAdmin} dark={dark} onChanged={reload} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CommentForm({ chapterId, parentId, onDone, onCancel, dark, placeholder }: {
  chapterId: number; parentId?: number; onDone: () => void; onCancel?: () => void; dark: boolean; placeholder: string;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await commentApi.create(chapterId, text.trim(), parentId);
      setText("");
      onDone();
      onCancel?.();
    } catch (err) {
      setError(getErrorMessage(err, "Không gửi được bình luận"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={parentId ? 2 : 3} placeholder={placeholder}
        aria-label={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm ${dark ? "border-gray-700 bg-gray-800 text-gray-100" : "bg-white"}`} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex items-center justify-end gap-2">
        <span className="mr-auto text-xs opacity-50">{text.length}/1000</span>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-full px-3 py-1.5 text-sm opacity-70 hover:opacity-100">Hủy</button>}
        <button disabled={busy || !text.trim()} className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">
          {parentId ? "Trả lời" : "Gửi bình luận"}
        </button>
      </div>
    </form>
  );
}

function CommentItem({ comment: c, chapterId, canReply, myId, isAdmin, dark, onChanged }: {
  comment: ChapterComment; chapterId: number; canReply: boolean; myId?: number; isAdmin: boolean; dark: boolean; onChanged: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState("");
  const mine = myId === c.userId;

  async function remove() {
    if (!window.confirm("Xóa bình luận này?")) return;
    await commentApi.remove(c.id);
    onChanged();
  }

  async function report(reason: string) {
    try {
      await commentApi.report(c.id, reason);
      setNotice("Đã gửi báo cáo, quản trị viên sẽ xem xét.");
    } catch (err) {
      setNotice(getErrorMessage(err, "Không gửi được báo cáo"));
    }
    setReporting(false);
  }

  const action = "text-xs opacity-60 hover:opacity-100";

  return (
    <div className="flex gap-3">
      <Avatar url={c.avatarUrl} name={c.displayName} size={32} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-semibold">{c.displayName}</span>
          <span className="ml-2 text-xs opacity-50">{timeAgo(c.createdAt)}</span>
        </p>
        {c.isHidden && !c.content ? (
          <p className="mt-0.5 text-sm italic opacity-50">Bình luận đã bị ẩn do vi phạm quy định.</p>
        ) : (
          <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">
            {c.isHidden && <span className="mr-1 rounded bg-red-100 px-1 text-xs text-red-700">Đã ẩn</span>}
            {c.content}
          </p>
        )}
        <div className="mt-1 flex gap-3">
          {canReply && <button onClick={() => setReplying((r) => !r)} className={action}>Trả lời</button>}
          {myId && !mine && !c.isHidden && <button onClick={() => setReporting((r) => !r)} className={action}>Báo cáo</button>}
          {(mine || isAdmin) && <button onClick={remove} className={`${action} text-red-600`}>Xóa</button>}
        </div>
        {reporting && (
          <div className="mt-2 flex flex-wrap gap-2">
            {REPORT_REASONS.map((r) => (
              <button key={r} onClick={() => report(r)} className={`rounded-full border px-3 py-1 text-xs ${dark ? "border-gray-600 hover:bg-gray-800" : "hover:bg-gray-50"}`}>{r}</button>
            ))}
          </div>
        )}
        {notice && <p className="mt-1 text-xs text-blue-700">{notice}</p>}
        {replying && (
          <div className="mt-2">
            <CommentForm chapterId={chapterId} parentId={c.id} onDone={onChanged} onCancel={() => setReplying(false)} dark={dark} placeholder={`Trả lời ${c.displayName}`} />
          </div>
        )}
      </div>
    </div>
  );
}
