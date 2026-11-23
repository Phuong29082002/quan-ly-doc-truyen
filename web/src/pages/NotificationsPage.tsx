import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getErrorMessage } from "../api/client";
import { notificationApi, notificationLink, type AppNotification } from "../api/community";
import { formatDateTime, timeAgo } from "../utils/format";

// PB29: tất cả thông báo, đánh dấu đã đọc
export default function NotificationsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<{ items?: AppNotification[]; error?: string }>();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    notificationApi
      .list()
      .then((items) => !ignore && setState({ items }))
      .catch((err) => !ignore && setState({ error: getErrorMessage(err, "Không tải được thông báo") }));
    return () => {
      ignore = true;
    };
  }, [version]);

  async function open(n: AppNotification) {
    if (!n.isRead) await notificationApi.markRead(n.id).catch(() => {});
    const link = notificationLink(n);
    if (link) navigate(link);
    else setVersion((v) => v + 1);
  }

  async function readAll() {
    await notificationApi.markAllRead();
    setVersion((v) => v + 1);
  }

  const unread = state?.items?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-story text-3xl font-semibold">Thông báo</h1>
          <p className="mt-1 text-sm text-gray-500">{unread ? `${unread} thông báo chưa đọc` : "Bạn đã đọc hết thông báo"}</p>
        </div>
        {unread > 0 && <button onClick={readAll} className="rounded-full border bg-white px-4 py-1.5 text-sm hover:bg-gray-50">Đánh dấu tất cả đã đọc</button>}
      </div>

      {!state && <p className="py-12 text-center text-gray-500">Đang tải…</p>}
      {state?.error && <p className="py-12 text-center text-red-600">{state.error}</p>}
      {state?.items?.length === 0 && <p className="mt-8 rounded-xl border bg-white p-8 text-center text-gray-600">Chưa có thông báo nào. Theo dõi truyện để nhận tin chương mới.</p>}

      {state?.items && state.items.length > 0 && (
        <ul className="mt-6 divide-y rounded-xl border bg-white">
          {state.items.map((n) => (
            <li key={n.id}>
              <button onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 ${n.isRead ? "" : "bg-lamp-soft/40"}`}>
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-lamp"}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${n.isRead ? "text-gray-700" : "font-medium text-gray-900"}`}>{n.message}</span>
                  <span className="text-xs text-gray-500" title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
