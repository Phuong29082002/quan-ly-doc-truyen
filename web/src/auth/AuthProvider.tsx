import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import type { AuthResponse, RegisterData, User } from "../api/types";
import { AuthContext, type AuthContextValue } from "./context";
import { clearAuth, loadUser, saveAuth, saveUser } from "./storage";

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

  const updateUser = useCallback((u: User) => {
    saveUser(u);
    setUser(u);
  }, []);

  // API trả 401 khi token hết hạn -> tự đăng xuất
  useEffect(() => {
    window.addEventListener("auth:expired", logout);
    return () => window.removeEventListener("auth:expired", logout);
  }, [logout]);

  // Older saved sessions may not contain avatarUrl; refresh the profile once after loading them.
  useEffect(() => {
    if (!user || user.avatarUrl !== undefined) return;
    let ignore = false;
    authApi.me().then((updated) => !ignore && updateUser(updated)).catch(() => {});
    return () => { ignore = true; };
  }, [user, updateUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.role === "Admin",
      login: async (login: string, password: string) => handleAuth(await authApi.login(login, password)),
      register: async (data: RegisterData) => handleAuth(await authApi.register(data)),
      logout,
      updateUser,
    }),
    [user, handleAuth, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
