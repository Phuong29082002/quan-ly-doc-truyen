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
      <div className="max-w-sm mx-auto bg-white border rounded-lg p-6 mt-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold mb-2 text-green-700">Đặt lại mật khẩu thành công!</h1>
        <p className="text-gray-600 text-sm mb-6">
          Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.
        </p>

        <button
          onClick={() => navigate("/login")}
          className="w-full rounded bg-blue-600 py-2 text-white font-medium hover:bg-blue-700"
        >
          Về trang đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white border rounded-lg p-6 mt-6">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-1 text-center">Đặt lại mật khẩu</h1>
      <p className="text-sm text-gray-500 text-center mb-6">
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
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="example@gmail.com"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* OTP */}
        <div>
          <label htmlFor="reset-otp" className="block text-sm font-medium text-gray-700 mb-1">
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
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Mật khẩu mới */}
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu mới
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Tối thiểu 6 ký tự"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Nhập lại mật khẩu mới
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Nhập lại mật khẩu"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
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
