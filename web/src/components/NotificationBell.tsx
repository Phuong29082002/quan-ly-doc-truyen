import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { notificationApi, notificationLink, type AppNotification } from "../api/community";
import { timeAgo } from "../utils/format";

interface Props {
  unread: number;
  onOpened: () => void;
}

// PB29: chuông thông báo; số chưa đọc cập nhật tức thì qua SignalR (PB46)
export default function NotificationBell({ unread, onOpened }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setItems(null);
    try {
      setItems((await notificationApi.list()).slice(0, 8));
      if (unread > 0) {
        await notificationApi.markAllRead();
        onOpened();
      }
    } catch {
      setItems([]);
    }
  }

  function openItem(n: AppNotification) {
    setOpen(false);
    const link = notificationLink(n);
    if (link) navigate(link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        className="relative grid h-9 w-9 place-items-center rounded-full text-white/85 hover:bg-white/10"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M12 2a6 6 0 0 0-6 6v3.6l-1.7 3.4A1 1 0 0 0 5.2 16.5h13.6a1 1 0 0 0 .9-1.5L18 11.6V8a6 6 0 0 0-6-6Zm0 20a3 3 0 0 0 2.83-2H9.17A3 3 0 0 0 12 22Z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-lamp px-1 text-center text-[11px] font-bold leading-5 text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-xl border bg-white text-gray-900 shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="font-semibold">Thông báo</span>
            <Link to="/thong-bao" onClick={() => setOpen(false)} className="text-xs text-blue-700 hover:underline">Xem tất cả</Link>
          </div>
          {items === null && <p className="px-4 py-6 text-center text-sm text-gray-500">Đang tải…</p>}
          {items?.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-500">Chưa có thông báo. Theo dõi một truyện để được báo khi có chương mới.</p>
          )}
          <ul className="max-h-96 overflow-y-auto">
            {items?.map((n) => (
              <li key={n.id}>
                <button onClick={() => openItem(n)} className={`block w-full border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-gray-50 ${n.isRead ? "" : "bg-blue-50/60"}`}>
                  <span className="block leading-snug">{n.message}</span>
                  <span className="mt-1 block text-xs text-gray-500">{timeAgo(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
