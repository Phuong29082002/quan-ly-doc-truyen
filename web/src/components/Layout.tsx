import { NavLink, Outlet } from "react-router";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "font-semibold text-blue-600" : "text-gray-600 hover:text-blue-600";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <NavLink to="/" className="text-lg font-bold text-blue-600">Đọc Truyện</NavLink>
          <nav className="flex gap-4 text-sm">
            <NavLink to="/" end className={linkClass}>Trang chủ</NavLink>
            <NavLink to="/admin" className={linkClass}>Quản trị</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <NavLink to="/login" className={linkClass}>Đăng nhập</NavLink>
            <NavLink to="/register" className="px-3 py-1.5 rounded bg-blue-600 text-white">Đăng ký</NavLink>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t bg-white py-4 text-center text-sm text-gray-500">
        © 2026 Hệ thống Quản lý Đọc truyện - Nhóm 3 HUFLIT
      </footer>
    </div>
  );
}