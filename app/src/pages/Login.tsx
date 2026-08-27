import { useState } from "react";
import { useNavigate } from "react-router";
import { Waves } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTitle } from "@/lib/title";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useTitle(mode === "login" ? "登录" : "注册");

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(username.trim(), password);
      else await register(username.trim(), password, nickname.trim() || username.trim());
      navigate("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full border border-sea-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-400";

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl border border-sea-100 p-8 space-y-4 mt-6">
      <div className="text-center">
        <Waves className="w-10 h-10 text-sea-600 mx-auto mb-2" />
        <h1 className="text-lg font-bold text-sea-900">{mode === "login" ? "登录海洋之心" : "注册新账号"}</h1>
      </div>
      <div className="flex rounded-lg overflow-hidden border border-sea-200 text-sm">
        <button onClick={() => setMode("login")} className={`flex-1 py-2 ${mode === "login" ? "bg-sea-700 text-white" : "bg-white text-sea-700"}`}>登录</button>
        <button onClick={() => setMode("register")} className={`flex-1 py-2 ${mode === "register" ? "bg-sea-700 text-white" : "bg-white text-sea-700"}`}>注册</button>
      </div>
      <div className="space-y-3">
        <input className={inputCls} placeholder="用户名(3-20 位)" value={username} onChange={(e) => setUsername(e.target.value)} />
        {mode === "register" && (
          <input className={inputCls} placeholder="昵称(前台展示)" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        )}
        <input className={inputCls} type="password" placeholder={mode === "register" ? "密码(至少 8 位)" : "密码"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || username.trim().length < 3 || (mode === "register" && password.length < 8)}
        className="w-full bg-sea-700 hover:bg-sea-600 disabled:bg-slate-300 text-white py-2.5 rounded-lg transition"
      >
        {busy ? "处理中…" : mode === "login" ? "登录" : "注册并登录"}
      </button>
      <p className="text-[11px] text-slate-400 text-center">
        注册即同意社区规范:发帖/回帖实行后台实名制;禁止发布保护野生动物交易信息。
      </p>
    </div>
  );
}
