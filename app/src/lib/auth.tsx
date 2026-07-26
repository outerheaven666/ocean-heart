import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { trpc, TOKEN_KEY } from "./trpc";

export interface Me {
  id: number;
  username: string;
  nickname: string;
  role: "user" | "admin" | "merchant";
  realName: string | null;
}

interface AuthCtx {
  me: Me | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const u = await trpc.auth.me.query();
      setMe(u as Me);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await trpc.auth.login.mutate({ username, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    setMe(res.user as Me);
  }, []);

  const register = useCallback(async (username: string, password: string, nickname: string) => {
    const res = await trpc.auth.register.mutate({ username, password, nickname });
    localStorage.setItem(TOKEN_KEY, res.token);
    setMe(res.user as Me);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setMe(null);
  }, []);

  return <Ctx.Provider value={{ me, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
