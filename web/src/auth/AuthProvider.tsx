import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import type { AuthResponse, RegisterData, User } from "../api/types";
import { AuthContext, type AuthContextValue } from "./context";
import { clearAuth, loadUser, saveAuth } from "./storage";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  const handleAuth = useCallback((res: AuthResponse) => {
    saveAuth(res);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  // API trả 401 khi token hết hạn -> tự đăng xuất
  useEffect(() => {
    window.addEventListener("auth:expired", logout);
    return () => window.removeEventListener("auth:expired", logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.role === "Admin",
      login: async (login: string, password: string) => handleAuth(await authApi.login(login, password)),
      register: async (data: RegisterData) => handleAuth(await authApi.register(data)),
      logout,
    }),
    [user, handleAuth, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
