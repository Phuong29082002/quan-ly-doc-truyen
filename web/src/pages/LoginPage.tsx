import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";
import FormField from "../components/FormField";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID =
  "902770820195-8vhau1co9oh8imm74kdreb65hqa711h5.apps.googleusercontent.com";

// PB02: đăng nhập
export default function LoginPage() {
  const { user, login, googleLogin } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Giữ bản mới nhất của googleLogin để callback của Google gọi đúng hàm
  const googleLoginRef = useRef(googleLogin);
  useEffect(() => {
    googleLoginRef.current = googleLogin;
  }, [googleLogin]);

  // Khởi tạo Google Sign-In button
  useEffect(() => {
    if (user) return;

    async function handleGoogleResponse(response: { credential: string }) {
      setError("");
      setGoogleLoading(true);
      try {
        await googleLoginRef.current(response.credential);
      } catch (err) {
        setError(getErrorMessage(err, "Đăng nhập Google thất bại"));
      } finally {
        setGoogleLoading(false);
      }
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: "100%",
          text: "signin_with",
          locale: "vi",
        });
      }
    };
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [user]);

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
    <div className="mx-auto mt-8 max-w-sm rounded-2xl border bg-white p-7 shadow-sm">
      <h1 className="mb-6 text-center font-story text-3xl font-semibold">Đăng nhập</h1>

      {error && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Google Sign-In Button */}
      <div className="mb-4">
        {googleLoading ? (
          <div className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded py-2 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Đang xác thực Google...
          </div>
        ) : (
          <div ref={googleBtnRef} className="w-full" />
        )}
      </div>

      {/* Đường phân cách */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-400">hoặc đăng nhập bằng mật khẩu</span>
        </div>
      </div>

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

        {/* Link quên mật khẩu */}
        <div className="mb-4 text-right">
          <Link to="/quen-mat-khau" className="text-sm text-blue-600 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-ink py-2.5 font-medium text-white hover:bg-ink-soft disabled:opacity-60"
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
