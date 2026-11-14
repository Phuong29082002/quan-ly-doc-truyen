import { HubConnectionBuilder, LogLevel, type HubConnection } from "@microsoft/signalr";
import { useEffect, useState } from "react";
import { API_URL } from "../api/client";
import { notificationApi, type AppNotification } from "../api/community";
import { getToken } from "../auth/storage";

/**
 * PB29, PB46: số thông báo chưa đọc + thông báo mới nhất nhận qua SignalR.
 * Kết nối /hubs/notifications khi đã đăng nhập; mất kết nối thì tự kết nối lại.
 */
export function useNotifications(userId: number | undefined) {
  const [state, setState] = useState<{ userId?: number; unread: number; latest: AppNotification | null }>({ unread: 0, latest: null });

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    let connection: HubConnection | null = null;

    notificationApi
      .unreadCount()
      .then((count) => !stopped && setState({ userId, unread: count, latest: null }))
      .catch(() => {});

    connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/notifications`, { accessTokenFactory: () => getToken() ?? "" })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("notification", (n: AppNotification) => {
      if (stopped) return;
      setState((s) => ({ userId, unread: (s.userId === userId ? s.unread : 0) + 1, latest: n }));
    });

    connection.start().catch(() => {
      // API chưa chạy hoặc mạng lỗi: vẫn dùng được, chỉ không có thông báo tức thì
    });

    return () => {
      stopped = true;
      connection?.stop();
    };
  }, [userId]);

  const active = state.userId === userId && !!userId;
  return {
    unread: active ? state.unread : 0,
    latest: active ? state.latest : null,
    markAllSeen: () => setState((s) => ({ ...s, unread: 0 })),
    decrement: () => setState((s) => ({ ...s, unread: Math.max(0, s.unread - 1) })),
  };
}
