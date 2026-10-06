import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";
import FormField from "../components/FormField";

type Fields = "username" | "displayName" | "email" | "password" | "confirmPassword";
type Errors = Partial<Record<Fields, string>>;

// Kiểm tra giống bên backend để báo lỗi ngay, không cần gọi API
function validate(f: Record<Fields, string>): Errors {
  const errors: Errors = {};
  if (!f.username.trim()) errors.username = "Vui lòng nhập tên đăng nhập";
  else if (f.username.trim().length < 3 || f.username.trim().length > 50) errors.username = "Tên đăng nhập từ 3 đến 50 ký tự";
  else if (!/^[a-zA-Z0-9_.]+$/.test(f.username.trim())) errors.username = "Chỉ gồm chữ không dấu, số, dấu _ và .";

  if (!f.email.trim()) errors.email = "Vui lòng nhập email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = "Email không hợp lệ";

  if (!f.password) errors.password = "Vui lòng nhập mật khẩu";
  else if (f.password.length < 6) errors.password = "Mật khẩu tối thiểu 6 ký tự";

  if (f.confirmPassword !== f.password) errors.confirmPassword = "Mật khẩu nhập lại không khớp";
  return errors;
}

// PB01: đăng ký tài khoản thành viên
export default function RegisterPage() {
  const { user, register } = useAuth();
  const [form, setForm] = useState<Record<Fields, string>>({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // Đăng ký thành công thì tự đăng nhập luôn -> về trang chủ
  if (user) return <Navigate to="/" replace />;

  const set = (field: Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setLoading(true);
    try {
      await register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName.trim() || undefined,
      });
    } catch (err) {
      setServerError(getErrorMessage(err, "Đăng ký thất bại"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-white border rounded-lg p-6 mt-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Đăng ký</h1>

      {serverError && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{serverError}</div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Tên đăng nhập" name="username" autoComplete="username"
          value={form.username} onChange={set("username")} error={errors.username} />
        <FormField label="Tên hiển thị (không bắt buộc)" name="displayName"
          value={form.displayName} onChange={set("displayName")} />
        <FormField label="Email" name="email" type="email" autoComplete="email"
          value={form.email} onChange={set("email")} error={errors.email} />
        <FormField label="Mật khẩu" name="password" type="password" autoComplete="new-password"
          value={form.password} onChange={set("password")} error={errors.password} />
        <FormField label="Nhập lại mật khẩu" name="confirmPassword" type="password" autoComplete="new-password"
          value={form.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Đã có tài khoản?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
      </p>
    </div>
  );
}
