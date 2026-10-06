import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";
import FormField from "../components/FormField";

// PB02: đăng nhập
export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Đăng nhập thành công (hoặc đã đăng nhập sẵn) -> quay về trang trước đó
  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.login.trim() || !form.password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu");
      return;
    }

    setLoading(true);
    try {
      await login(form.login.trim(), form.password);
    } catch (err) {
      setError(getErrorMessage(err, "Đăng nhập thất bại"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto bg-white border rounded-lg p-6 mt-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Đăng nhập</h1>

      {error && <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <FormField
          label="Tên đăng nhập hoặc email"
          name="login"
          autoComplete="username"
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
        />
        <FormField
          label="Mật khẩu"
          name="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="text-blue-600 hover:underline">Đăng ký</Link>
      </p>
    </div>
  );
}
