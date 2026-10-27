import { useState, type FormEvent } from "react";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";
import Alert from "../components/Alert";
import FormField from "../components/FormField";

type Msg = { type: "error" | "success"; text: string } | null;

// PB04: xem, cập nhật hồ sơ và đổi mật khẩu
export default function ProfilePage() {
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
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Tài khoản của tôi</h1>

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
