import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { useAuth } from "./useAuth";

// PB03: chỉ Admin mới vào được trang quản trị
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (!isAdmin) {
    return (
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold mb-2">403</h1>
        <p className="mb-4 text-gray-600">Bạn không có quyền truy cập trang quản trị</p>
        <Link to="/" className="text-blue-600 underline">Về trang chủ</Link>
      </div>
    );
  }

  return <>{children}</>;
}
