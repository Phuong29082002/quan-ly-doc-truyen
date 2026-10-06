import { NavLink, Outlet } from "react-router";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded px-3 py-2 text-sm ${isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`;

// Khung trang quản trị (PB03: chỉ Admin vào được, xem RequireAdmin trong App.tsx)
export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="md:w-48 shrink-0">
        <h2 className="mb-2 px-3 text-xs font-semibold uppercase text-gray-500">Quản trị</h2>
        <nav className="flex gap-1 md:flex-col">
          <NavLink to="/admin/truyen" className={linkClass}>Truyện & chương</NavLink>
          <NavLink to="/admin/the-loai" className={linkClass}>Thể loại</NavLink>
        </nav>
      </aside>
      <section className="min-w-0 flex-1">
        <Outlet />
      </section>
    </div>
  );
}
