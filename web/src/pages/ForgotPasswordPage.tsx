import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { authApi } from "../api/auth";
import { getErrorMessage } from "../api/client";

// Quên mật khẩu: nhập email để nhận OTP
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Vui lòng nhập email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Email không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, "Có lỗi xảy ra, vui lòng thử lại"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto bg-white border rounded-lg p-6 mt-6 text-center">
        {/* Icon mail */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold mb-2">Kiểm tra email của bạn</h1>
        <p className="text-gray-600 text-sm mb-1">
          Nếu địa chỉ <strong>{email}</strong> tồn tại trong hệ thống,
        </p>
        <p className="text-gray-600 text-sm mb-6">
          chúng tôi đã gửi mã OTP 6 chữ số. Mã có hiệu lực trong <strong>10 phút</strong>.
        </p>

        <button
          onClick={() => navigate(`/dat-lai-mat-khau?email=${encodeURIComponent(email)}`)}
          className="w-full rounded bg-blue-600 py-2 text-white font-medium hover:bg-blue-700 mb-3"
        >
          Nhập mã OTP
        </button>

        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="w-full rounded border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Thử email khác
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
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-1 text-center">Quên mật khẩu?</h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Đang gửi..." : "Gửi mã OTP"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Nhớ mật khẩu rồi?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
      </p>
    </div>
  );
}
