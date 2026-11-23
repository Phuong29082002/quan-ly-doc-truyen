import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { notificationLink } from "../api/community";
import { useAuth } from "../auth/useAuth";
import { useNotifications } from "../notifications/useNotifications";
import Avatar from "./Avatar";
import InstallAppButton from "./InstallAppButton";
import NotificationBell from "./NotificationBell";
import SearchSuggest from "./SearchSuggest";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `relative py-1 text-sm transition-colors ${
    isActive ? "text-white after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-lamp" : "text-white/70 hover:text-white"
  }`;

// Ngọn đèn đọc sách: biểu tượng của trang
function LampMark() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7">
      <circle cx="16" cy="13" r="9" className="fill-lamp/25" />
      <path d="M10 7h12l-3 8h-6z" className="fill-lamp" />
      <path d="M15 15h2v9h-2z" className="fill-white/80" />
      <path d="M9 25h14v2H9z" className="fill-white/80" />
    </svg>
  );
}

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useNotifications(user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Thông báo mới qua SignalR: hiện một dòng nhỏ ở góc màn hình trong 6 giây
  const latest = notifications.latest;
  const [dismissed, setDismissed] = useState<number | null>(null);
  useEffect(() => {
    if (!latest) return;
    const timer = window.setTimeout(() => setDismissed(latest.id), 6000);
    return () => window.clearTimeout(timer);
  }, [latest]);
  const toast = latest && dismissed !== latest.id ? latest : null;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Đổi trang thì đóng menu điện thoại
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMenuOpen(false);
    setUserMenu(false);
  }

  // Giao diện tối cho trang người đọc; trang chủ và trang truyện có đầu trang trong suốt nằm trên ảnh nền
  const isAdminPage = location.pathname.startsWith("/admin");
  const immersive = location.pathname === "/" ? !location.search : /^\/truyen\/\d+$/.test(location.pathname);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const solidHeader = !immersive || scrolled || menuOpen;

  function handleLogout() {
    logout();
    navigate("/");
  }

  const links = (
    <>
      <NavLink to="/" end className={navClass}>Trang chủ</NavLink>
      <NavLink to="/xep-hang" className={navClass}>Xếp hạng</NavLink>
      <NavLink to="/goi-doc" className={navClass}>Gói đọc</NavLink>
      <NavLink to="/nhiem-vu" className={navClass}>Nhiệm vụ & Xu</NavLink>
      {user && <NavLink to="/dang-doc" className={navClass}>Đang đọc</NavLink>}
      {user && <NavLink to="/theo-doi" className={navClass}>Theo dõi</NavLink>}
      {user && <NavLink to="/huy-hieu" className={navClass}>Huy hiệu</NavLink>}
      {/* PB03: chỉ Admin mới thấy menu Quản trị */}
      {isAdmin && <NavLink to="/admin" className={navClass}>Quản trị</NavLink>}
    </>
  );

  return (
    <div className={`flex min-h-screen flex-col overflow-x-clip ${isAdminPage ? "" : "cinema"}`}>
      <header className={`sticky top-0 z-30 text-white transition-colors duration-300 ${
        solidHeader
          ? isAdminPage ? "bg-ink shadow-[0_1px_0_rgb(255_255_255/0.06)]" : "bg-[#0f1220]/95 shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur"
          : "bg-gradient-to-b from-black/75 to-transparent"
      }`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-5 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <LampMark />
            <span className="font-story text-xl font-semibold tracking-tight">Đọc Truyện</span>
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">{links}</nav>

          <SearchSuggest className="ml-auto hidden w-72 md:block" />

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {user ? (
              <>
                <Link
                  to="/nhiem-vu"
                  title="Ví xu & Nhiệm vụ"
                  className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 transition hover:bg-amber-400/30"
                >
                  <span>🪙</span>
                  <span>{user.coins ?? 0}</span>
                </Link>
                <NotificationBell unread={notifications.unread} onOpened={notifications.markAllSeen} />
                <div ref={userMenuRef} className="relative">
                  <button onClick={() => setUserMenu((o) => !o)} className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-white/10" aria-haspopup="menu" aria-expanded={userMenu}>
                    <Avatar url={user.avatarUrl} name={user.displayName} size={32} />
                    <span className="hidden max-w-32 truncate text-sm sm:block">{user.displayName}</span>
                  </button>
                  {userMenu && (
                    <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border bg-white py-1 text-sm text-gray-800 shadow-xl">
                      <div className="border-b px-4 py-2.5">
                        <p className="truncate font-semibold">{user.displayName}</p>
                        <p className="truncate text-xs text-gray-500">@{user.username}</p>
                        {isAdmin && <p className="mt-0.5 text-xs font-medium text-amber-700">Quản trị viên</p>}
                      </div>
                      <Link role="menuitem" to="/tai-khoan" className="block px-4 py-2 hover:bg-gray-50">Tài khoản của tôi</Link>
                      <Link role="menuitem" to="/huy-hieu" className="block px-4 py-2 hover:bg-gray-50">Huy hiệu của tôi</Link>
                      <Link role="menuitem" to="/nhiem-vu" className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-amber-800 font-medium">
                        <span>🪙 Nhiệm vụ & Ví xu</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold">{user.coins ?? 0} xu</span>
                      </Link>
                      <Link role="menuitem" to="/tai-khoan?tab=tu-sach" className="block px-4 py-2 hover:bg-gray-50">Gói đọc & truyện đã mua</Link>
                      <Link role="menuitem" to="/tai-khoan?tab=lich-su" className="block px-4 py-2 hover:bg-gray-50">Lịch sử thanh toán</Link>
                      <Link role="menuitem" to="/thong-bao" className="block px-4 py-2 hover:bg-gray-50">Thông báo</Link>
                      <button role="menuitem" onClick={handleLogout} className="block w-full border-t px-4 py-2 text-left text-red-600 hover:bg-red-50">Đăng xuất</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-3 py-1.5 text-sm text-white/85 hover:text-white">Đăng nhập</Link>
                <Link to="/register" className="rounded-full bg-lamp px-4 py-1.5 text-sm font-semibold text-ink hover:bg-amber-300">Đăng ký</Link>
              </>
            )}
            <button onClick={() => setMenuOpen((o) => !o)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 lg:hidden" aria-label="Mở menu" aria-expanded={menuOpen}>
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" /></svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 px-4 pb-4 pt-3 lg:hidden">
            <SearchSuggest className="mb-3 md:hidden" />
            <nav className="flex flex-col gap-3 [&_a]:after:hidden">{links}</nav>
          </div>
        )}
      </header>

      {user?.status === "Restricted" && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          Tài khoản của bạn đang bị hạn chế: vẫn đọc truyện được nhưng không thể bình luận.
          {user.statusReason ? ` Lý do: ${user.statusReason}` : ""}
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className={`mt-10 text-white/70 ${isAdminPage ? "bg-ink" : "border-t border-white/5 bg-[#0b0d18]"}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-white"><LampMark /> <span className="font-story">Đọc Truyện</span></span>
          <span className="flex flex-wrap items-center gap-3">
            <InstallAppButton />
            Đồ án Công nghệ Phần mềm Nâng cao, nhóm 3, HUFLIT 2026
          </span>
        </div>
      </footer>

      {toast && (
        <button
          onClick={() => {
            setDismissed(toast.id);
            notifications.decrement();
            const link = notificationLink(toast);
            if (link) navigate(link);
          }}
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-xl bg-ink px-4 py-3 text-left text-sm text-white shadow-2xl"
        >
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-lamp" />
          <span>{toast.message}</span>
        </button>
      )}
    </div>
  );
}
