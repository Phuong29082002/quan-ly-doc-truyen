import { useState, type ChangeEvent, type FormEvent } from "react";
import { Navigate } from "react-router";
import { authApi } from "../api/auth";
import { assetUrl, getErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";
import Alert from "../components/Alert";
import FormField from "../components/FormField";

type Message = { type: "error" | "success"; text: string } | null;

// PB04: xem và cập nhật hồ sơ, ảnh đại diện, đổi mật khẩu
export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace state={{ from: "/tai-khoan" }} />;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Tài khoản của tôi</h1>
      <InfoSection />
      <PasswordSection />
    </div>
  );
}

function InfoSection() {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user!.displayName);
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!displayName.trim()) return setMessage({ type: "error", text: "Vui lòng nhập tên hiển thị" });

    setSaving(true);
    try {
      updateUser(await authApi.updateProfile(displayName.trim()));
      setMessage({ type: "success", text: "Đã cập nhật hồ sơ" });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Cập nhật thất bại") });
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMessage(null);
    if (file.size > 2 * 1024 * 1024) return setMessage({ type: "error", text: "Ảnh đại diện tối đa 2MB" });

    setUploading(true);
    try {
      updateUser(await authApi.uploadAvatar(file));
      setMessage({ type: "success", text: "Đã đổi ảnh đại diện" });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Tải ảnh thất bại") });
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Thông tin cá nhân</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <div className="mb-5 flex items-center gap-4">
        {user!.avatarUrl ? (
          <img src={assetUrl(user!.avatarUrl)!} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl font-semibold text-blue-700">
            {user!.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <label className="cursor-pointer rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
          {uploading ? "Đang tải..." : "Đổi ảnh đại diện"}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" disabled={uploading} onChange={handleAvatar} />
        </label>
        <span className="text-xs text-gray-500">JPG, PNG, WEBP, tối đa 2MB</span>
      </div>

      <dl className="mb-4 grid grid-cols-[110px_1fr] gap-y-1.5 text-sm">
        <dt className="text-gray-500">Tên đăng nhập</dt>
        <dd>{user!.username}</dd>
        <dt className="text-gray-500">Email</dt>
        <dd>{user!.email}</dd>
        <dt className="text-gray-500">Vai trò</dt>
        <dd>{user!.role === "Admin" ? "Quản trị viên" : "Thành viên"}</dd>
      </dl>

      <form onSubmit={handleSave} noValidate>
        <FormField label="Tên hiển thị" name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <button disabled={saving} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>
    </section>
  );
}

function PasswordSection() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [message, setMessage] = useState<Message>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!form.current) return setMessage({ type: "error", text: "Vui lòng nhập mật khẩu hiện tại" });
    if (form.next.length < 6) return setMessage({ type: "error", text: "Mật khẩu mới tối thiểu 6 ký tự" });
    if (form.next !== form.confirm) return setMessage({ type: "error", text: "Mật khẩu nhập lại không khớp" });

    setSaving(true);
    try {
      await authApi.changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      setMessage({ type: "success", text: "Đã đổi mật khẩu" });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Đổi mật khẩu thất bại") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold">Đổi mật khẩu</h2>
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Mật khẩu hiện tại" name="current" type="password" autoComplete="current-password"
          value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        <FormField label="Mật khẩu mới" name="next" type="password" autoComplete="new-password"
          value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        <FormField label="Nhập lại mật khẩu mới" name="confirm" type="password" autoComplete="new-password"
          value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        <button disabled={saving} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? "Đang lưu..." : "Đổi mật khẩu"}
        </button>
      </form>
    </section>
  );
}
