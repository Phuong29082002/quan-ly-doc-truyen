import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { authApi } from "../api/auth";
import { meApi, TRANSACTION_STATUS_LABEL, type MyLibrary, type Transaction } from "../api/payments";
import { formatDate, formatDateTime, formatPrice } from "../utils/format";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";
import Alert from "../components/Alert";
import FormField from "../components/FormField";

type Msg = { type: "error" | "success"; text: string } | null;

const TABS = [
  { id: "thong-tin", label: "Thông tin tài khoản" },
  { id: "tu-sach", label: "Gói đọc & truyện đã mua" },
  { id: "lich-su", label: "Lịch sử thanh toán" },
] as const;

// PB04: hồ sơ cá nhân; PB25: gói đang dùng, truyện đã mua, lịch sử thanh toán
export default function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get("tab"))?.id ?? "thong-tin";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Tài khoản của tôi</h1>
      <div className="mb-5 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setParams(t.id === "thong-tin" ? {} : { tab: t.id })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.id ? "border-blue-600 font-semibold text-blue-600" : "border-transparent text-gray-600 hover:text-blue-600"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "thong-tin" && <ProfileInfo />}
      {tab === "tu-sach" && <LibraryTab />}
      {tab === "lich-su" && <HistoryTab />}
    </div>
  );
}

function ProfileInfo() {
  const { user, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [saving, setSaving] = useState<"profile" | "password" | null>(null);

  if (!user) return null;

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    if (!displayName.trim()) return setProfileMsg({ type: "error", text: "Vui lòng nhập tên hiển thị" });

    setSaving("profile");
    try {
      updateUser(await authApi.updateProfile(displayName.trim()));
      setProfileMsg({ type: "success", text: "Đã cập nhật tên hiển thị" });
    } catch (err) {
      setProfileMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setSaving(null);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (!pw.current || !pw.next) return setPwMsg({ type: "error", text: "Vui lòng nhập đầy đủ mật khẩu" });
    if (pw.next.length < 6) return setPwMsg({ type: "error", text: "Mật khẩu mới tối thiểu 6 ký tự" });
    if (pw.next !== pw.confirm) return setPwMsg({ type: "error", text: "Mật khẩu nhập lại không khớp" });

    setSaving("password");
    try {
      await authApi.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      setPwMsg({ type: "success", text: "Đã đổi mật khẩu" });
    } catch (err) {
      setPwMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setSaving(null);
    }
  }

  const btn = "rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60";

  return (
    <div className="max-w-xl space-y-6">

      <div className="rounded-lg border bg-white p-5">
        <dl className="mb-4 grid grid-cols-[130px_1fr] gap-y-1.5 text-sm">
          <dt className="text-gray-500">Tên đăng nhập</dt>
          <dd>{user.username}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-gray-500">Vai trò</dt>
          <dd>{user.role === "Admin" ? "Quản trị viên" : "Thành viên"}</dd>
        </dl>

        <form onSubmit={saveProfile} noValidate>
          {profileMsg && <Alert type={profileMsg.type}>{profileMsg.text}</Alert>}
          <FormField label="Tên hiển thị" name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <button disabled={saving !== null} className={btn}>{saving === "profile" ? "Đang lưu..." : "Lưu"}</button>
        </form>
      </div>

      <form onSubmit={changePassword} className="rounded-lg border bg-white p-5" noValidate>
        <h2 className="mb-4 text-lg font-semibold">Đổi mật khẩu</h2>
        {pwMsg && <Alert type={pwMsg.type}>{pwMsg.text}</Alert>}
        <FormField label="Mật khẩu hiện tại" name="current" type="password" autoComplete="current-password"
          value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <FormField label="Mật khẩu mới" name="next" type="password" autoComplete="new-password"
          value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        <FormField label="Nhập lại mật khẩu mới" name="confirm" type="password" autoComplete="new-password"
          value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        <button disabled={saving !== null} className={btn}>{saving === "password" ? "Đang đổi..." : "Đổi mật khẩu"}</button>
      </form>
    </div>
  );
}

// PB25: gói đang dùng + hạn gói, truyện đã mua
function LibraryTab() {
  const [state, setState] = useState<{ data?: MyLibrary; error?: string }>();

  useEffect(() => {
    let ignore = false;
    meApi
      .library()
      .then((data) => !ignore && setState({ data }))
      .catch((err) => !ignore && setState({ error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, []);

  if (!state) return <p className="text-gray-500">Đang tải...</p>;
  if (state.error || !state.data) return <Alert>{state.error ?? "Không tải được dữ liệu"}</Alert>;

  const { packages, purchases } = state.data;
  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Gói đọc</h2>
          <Link to="/goi-doc" className="text-sm text-blue-600 hover:underline">Đăng ký / gia hạn gói</Link>
        </div>
        {packages.length === 0 ? (
          <p className="text-sm text-gray-500">Bạn chưa đăng ký gói đọc nào.</p>
        ) : (
          <ul className="divide-y text-sm">
            {packages.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{p.packageName}</span>
                <span className="text-xs text-gray-500">{p.scope === "All" ? "Tất cả truyện" : "Một số truyện"}</span>
                <span className="ml-auto text-gray-600">{formatDate(p.startAt)} → {formatDateTime(p.endAt)}</span>
                {p.isActive ? (
                  <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Đang dùng</span>
                ) : new Date(p.startAt) > new Date() ? (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">Gia hạn, chưa tới lượt</span>
                ) : (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Hết hạn</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">Truyện đã mua</h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-500">Bạn chưa mua truyện nào.</p>
        ) : (
          <ul className="divide-y text-sm">
            {purchases.map((p) => (
              <li key={p.storyId} className="flex items-center gap-2 py-2">
                <Link to={`/truyen/${p.storyId}`} className="font-medium hover:text-blue-600">{p.storyTitle}</Link>
                <span className="ml-auto text-gray-600">{formatPrice(p.price)} · {formatDate(p.purchasedAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-gray-500">Truyện đã mua đọc được mãi mãi, không phụ thuộc hạn gói đọc.</p>
      </section>
    </div>
  );
}

const STATUS_STYLE = {
  Pending: "bg-amber-100 text-amber-700",
  Success: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
};

// PB25: lịch sử thanh toán
function HistoryTab() {
  const [state, setState] = useState<{ data?: Transaction[]; error?: string }>();

  useEffect(() => {
    let ignore = false;
    meApi
      .transactions()
      .then((data) => !ignore && setState({ data }))
      .catch((err) => !ignore && setState({ error: getErrorMessage(err) }));
    return () => {
      ignore = true;
    };
  }, []);

  if (!state) return <p className="text-gray-500">Đang tải...</p>;
  if (state.error || !state.data) return <Alert>{state.error ?? "Không tải được dữ liệu"}</Alert>;
  if (state.data.length === 0) return <p className="rounded border bg-white p-6 text-center text-gray-500">Chưa có giao dịch nào.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th className="px-3 py-2">Mã</th>
            <th className="px-3 py-2">Nội dung</th>
            <th className="px-3 py-2 text-right">Số tiền</th>
            <th className="px-3 py-2">Thời gian</th>
            <th className="px-3 py-2">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {state.data.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="px-3 py-2 font-mono">#{t.id}</td>
              <td className="px-3 py-2">
                {t.type === "Package" ? `${t.isRenewal ? "Gia hạn" : "Đăng ký"} gói ${t.packageName}` : `Mua truyện ${t.storyTitle}`}
                {t.packageEndAt && <span className="block text-xs text-gray-500">Hạn gói đến {formatDateTime(t.packageEndAt)}</span>}
              </td>
              <td className="px-3 py-2 text-right">{formatPrice(t.amount)}</td>
              <td className="px-3 py-2 text-xs">{formatDateTime(t.paidAt ?? t.createdAt)}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[t.status]}`}>{TRANSACTION_STATUS_LABEL[t.status]}</span>
                {t.status === "Pending" && (
                  <Link to={`/thanh-toan/ket-qua/${t.id}`} className="ml-2 text-xs text-blue-600 hover:underline">Kiểm tra</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
