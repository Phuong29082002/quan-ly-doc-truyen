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
      <div className="mx-auto mt-8 max-w-sm rounded-2xl border bg-white p-7 text-center shadow-sm">
        {/* Icon mail */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 font-story text-2xl font-semibold">Kiểm tra email của bạn</h1>
        <p className="mb-1 text-sm text-gray-600">
          Nếu địa chỉ <strong>{email}</strong> tồn tại trong hệ thống,
        </p>
        <p className="mb-6 text-sm text-gray-600">
          chúng tôi đã gửi mã OTP 6 chữ số. Mã có hiệu lực trong <strong>10 phút</strong>.
        </p>

        <button
          onClick={() => navigate(`/dat-lai-mat-khau?email=${encodeURIComponent(email)}`)}
          className="mb-3 w-full rounded-full bg-ink py-2.5 font-medium text-white hover:bg-ink-soft"
        >
          Nhập mã OTP
        </button>

        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="w-full rounded-full border border-gray-300 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Thử email khác
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
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
      </div>

      <h1 className="mb-1 text-center font-story text-3xl font-semibold">Quên mật khẩu?</h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
      </p>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-ink py-2.5 font-medium text-white hover:bg-ink-soft disabled:opacity-60"
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
