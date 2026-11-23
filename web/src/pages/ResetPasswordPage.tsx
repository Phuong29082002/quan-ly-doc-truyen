import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";

// Đặt lại mật khẩu bằng OTP đã nhận qua email
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";

  const [form, setForm] = useState({
    email: emailFromQuery,
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function validate(): string | null {
    if (!form.email.trim()) return "Vui lòng nhập email";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Email không hợp lệ";
    if (form.otp.length !== 6 || !/^\d+$/.test(form.otp)) return "Mã OTP phải là 6 chữ số";
    if (!form.newPassword) return "Vui lòng nhập mật khẩu mới";
    if (form.newPassword.length < 6) return "Mật khẩu mới tối thiểu 6 ký tự";
    if (form.newPassword !== form.confirmPassword) return "Mật khẩu xác nhận không khớp";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(form.email.trim(), form.otp, form.newPassword);
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, "Có lỗi xảy ra, vui lòng thử lại"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto mt-8 max-w-sm rounded-2xl border bg-white p-7 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 font-story text-2xl font-semibold text-green-700">Đặt lại mật khẩu thành công!</h1>
        <p className="mb-6 text-sm text-gray-600">
          Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.
        </p>

        <button
          onClick={() => navigate("/login")}
          className="w-full rounded-full bg-ink py-2.5 font-medium text-white hover:bg-ink-soft"
        >
          Về trang đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-sm rounded-2xl border bg-white p-7 shadow-sm">
      <div className="mb-4 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
          <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>

      <h1 className="mb-1 text-center font-story text-3xl font-semibold">Đặt lại mật khẩu</h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        Nhập mã OTP đã được gửi đến email của bạn.
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="example@gmail.com"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </div>

        {/* OTP */}
        <div>
          <label htmlFor="reset-otp" className="mb-1 block text-sm font-medium text-gray-700">
            Mã OTP (6 chữ số)
          </label>
          <input
            id="reset-otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={form.otp}
            onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            placeholder="123456"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </div>

        {/* Mật khẩu mới */}
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
            Mật khẩu mới
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Tối thiểu 6 ký tự"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
            Nhập lại mật khẩu mới
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Nhập lại mật khẩu"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-ink py-2.5 font-medium text-white hover:bg-ink-soft disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Chưa nhận được OTP?{" "}
        <Link to="/quen-mat-khau" className="text-blue-600 hover:underline">Gửi lại</Link>
      </p>
    </div>
  );
}
