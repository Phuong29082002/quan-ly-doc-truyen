import { useState, type FormEvent } from "react";
import { authApi } from "../api/auth";
import { assetUrl, getErrorMessage } from "../api/client";
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
  const [avatarMsg, setAvatarMsg] = useState<Msg>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarFileName, setAvatarFileName] = useState("");

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

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarMsg(null);
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return setAvatarMsg({ type: "error", text: "Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF" });
    if (file.size > 2 * 1024 * 1024) return setAvatarMsg({ type: "error", text: "Ảnh tối đa 2MB" });
    setAvatarSaving(true);
    try {
      updateUser(await authApi.uploadAvatar(file));
      setAvatarMsg({ type: "success", text: "Đã cập nhật ảnh đại diện" });
    } catch (err) {
      setAvatarMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setAvatarSaving(false);
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
          <div className="flex items-center gap-4">
          {user.avatarUrl ? <img src={assetUrl(user.avatarUrl) ?? ""} alt="Ảnh đại diện" className="h-20 w-20 rounded-full object-cover" /> : <div className="grid h-20 w-20 place-items-center rounded-full bg-gray-100 text-2xl text-gray-500">{user.displayName.slice(0, 1).toUpperCase()}</div>}
            <div className="min-w-0 flex-1">
              <FormField label="Tên hiển thị" name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <label className="block text-sm font-medium">Ảnh đại diện</label>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={avatarSaving}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) setAvatarFileName(file.name);
                    void uploadAvatar(file);
                    e.currentTarget.value = "";
                  }}
                  className="peer sr-only"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`inline-flex cursor-pointer items-center rounded-md border border-blue-700 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 ${avatarSaving ? "pointer-events-none opacity-60" : ""}`}
                >
                  {avatarSaving ? "Đang tải ảnh..." : "Chọn tập tin"}
                </label>
                <span className="max-w-full truncate text-sm text-gray-600" title={avatarFileName || undefined}>
                  {avatarFileName || "Chưa chọn tập tin"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP hoặc GIF, tối đa 2MB</p>
            </div>
          </div>
          {avatarMsg && <Alert type={avatarMsg.type}>{avatarMsg.text}</Alert>}
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
