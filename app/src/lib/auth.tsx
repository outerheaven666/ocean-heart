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

function friendlyAuthError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  // 静态部署(GitHub Pages)下接口返回 404 HTML,JSON 解析失败;或后端不可达
  if (msg.includes("valid JSON") || msg.includes("Unexpected token") || msg.includes("Failed to fetch") || msg.includes("NetworkError"))
    return new Error("当前为静态演示模式,登录/注册需要完整后端服务。请使用本地预览(npm run dev)体验完整功能。");
  return e instanceof Error ? e : new Error(msg);
}

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
    try {
      const res = await trpc.auth.login.mutate({ username, password });
      localStorage.setItem(TOKEN_KEY, res.token);
      setMe(res.user as Me);
    } catch (e) {
      throw friendlyAuthError(e);
    }
  }, []);

  const register = useCallback(async (username: string, password: string, nickname: string) => {
    try {
      const res = await trpc.auth.register.mutate({ username, password, nickname });
      localStorage.setItem(TOKEN_KEY, res.token);
      setMe(res.user as Me);
    } catch (e) {
      throw friendlyAuthError(e);
    }
  }, []);

  const logout = useCallback(() => {
    // 通知后端作废会话(失败也不影响本地退出)
    trpc.auth.logout.mutate().catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setMe(null);
  }, []);

  return <Ctx.Provider value={{ me, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
