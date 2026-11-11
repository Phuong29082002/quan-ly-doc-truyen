import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./useAuth";

/** Trang cần đăng nhập (ví dụ: hồ sơ cá nhân) */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
