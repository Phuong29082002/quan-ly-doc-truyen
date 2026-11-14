import { NavLink, Outlet } from "react-router";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? "bg-ink text-white" : "text-gray-700 hover:bg-gray-100"}`;

// Khung trang quản trị (PB03: chỉ Admin vào được, xem RequireAdmin trong App.tsx)
export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="md:w-48 shrink-0">
        <h2 className="mb-2 px-3 text-sm font-semibold text-gray-500">Quản trị</h2>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          <NavLink to="/admin/truyen" className={linkClass}>Truyện & chương</NavLink>
          <NavLink to="/admin/the-loai" className={linkClass}>Thể loại</NavLink>
          <NavLink to="/admin/goi-doc" className={linkClass}>Gói đọc</NavLink>
          <NavLink to="/admin/giao-dich" className={linkClass}>Giao dịch</NavLink>
          <NavLink to="/admin/kiem-duyet" className={linkClass}>Kiểm duyệt</NavLink>
          <NavLink to="/admin/thanh-vien" className={linkClass}>Thành viên</NavLink>
          <NavLink to="/admin/thong-ke" className={linkClass}>Thống kê</NavLink>
        </nav>
      </aside>
      <section className="min-w-0 flex-1">
        <Outlet />
      </section>
    </div>
  );
}
