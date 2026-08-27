import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import { fmtTime } from "@/lib/format";

type MyPost = { id: number; title: string; createdAt: number; views: number };

export default function Profile() {
  const { me, loading, refresh } = useAuth();
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [favs, setFavs] = useState<MyPost[]>([]);
  const [realName, setRealName] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"posts" | "favs">("posts");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");

  useEffect(() => {
    if (!me) return;
    trpc.posts.mine.query().then((r) => setPosts(r as MyPost[]));
    trpc.posts.myFavorites.query().then((r) => setFavs(r as MyPost[]));
  }, [me]);

  if (loading) return <p className="text-slate-400 py-10 text-center">加载中…</p>;
  if (!me)
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl border border-sea-100 p-8 text-center">
        <p className="text-slate-600 mb-4">请先登录</p>
        <Link to="/login" className="bg-sea-700 text-white px-5 py-2 rounded-lg">去登录</Link>
      </div>
    );

  const submitRealName = async () => {
    await trpc.auth.setRealName.mutate({ realName });
    setMsg("实名登记成功,现在可以发帖/回帖了。");
    await refresh();
  };

  const submitPwd = async () => {
    setPwdMsg("");
    try {
      await trpc.auth.changePassword.mutate({ oldPassword: oldPwd, newPassword: newPwd });
      setPwdMsg("密码改好啦,其他设备上的登录状态已失效,下次用新密码登录。");
      setOldPwd("");
      setNewPwd("");
    } catch (e: any) {
      setPwdMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const list = tab === "posts" ? posts : favs;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-sea-100 p-6">
        <h1 className="text-lg font-bold text-sea-900 mb-1">{me.nickname}</h1>
        <p className="text-xs text-slate-400 mb-4">@{me.username} · {me.role === "admin" ? "管理员" : me.role === "merchant" ? "商家" : "玩家"}</p>
        <div className="bg-sea-50 rounded-lg p-4">
          <h2 className="text-sm font-bold text-sea-900 mb-1">后台实名登记</h2>
          <p className="text-xs text-slate-500 mb-3">依据国家 UGC 内容合规要求,发帖/回帖需完成后台实名。实名信息仅平台后台留存,前台永不展示。</p>
          {me.realName ? (
            <p className="text-sm text-emerald-600">已完成实名登记 ✓</p>
          ) : (
            <div className="flex gap-2">
              <input
                value={realName}
                onChange={(e) => setRealName(e.target.value)}
                placeholder="请输入真实姓名"
                className="flex-1 border border-sea-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sea-400"
              />
              <button
                onClick={submitRealName}
                disabled={realName.trim().length < 2}
                className="bg-sea-700 hover:bg-sea-600 disabled:bg-slate-300 text-white text-sm px-4 rounded-lg transition"
              >
                提交
              </button>
            </div>
          )}
          {msg && <p className="text-xs text-emerald-600 mt-2">{msg}</p>}
        </div>

        <div className="bg-sea-50 rounded-lg p-4 mt-3">
          <h2 className="text-sm font-bold text-sea-900 mb-3">修改密码</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              placeholder="现在的密码"
              className="flex-1 border border-sea-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sea-400"
            />
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="新密码(至少 8 位)"
              className="flex-1 border border-sea-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sea-400"
            />
            <button
              onClick={submitPwd}
              disabled={!oldPwd || newPwd.length < 8}
              className="bg-sea-700 hover:bg-sea-600 disabled:bg-slate-300 text-white text-sm px-4 py-2 rounded-lg transition"
            >
              确认修改
            </button>
          </div>
          {pwdMsg && <p className="text-xs mt-2 text-slate-500">{pwdMsg}</p>}
        </div>

        {me.role === "admin" && (
          <Link
            to="/admin"
            className="mt-3 flex items-center gap-2 bg-sea-900 text-white rounded-lg p-4 hover:bg-sea-800 transition"
          >
            <ShieldCheck className="w-5 h-5 text-sand-300" />
            <div>
              <p className="text-sm font-bold">管理工作台</p>
              <p className="text-xs text-sea-300">商家审核 · 数据总览(精华/删帖在帖子页直接操作)</p>
            </div>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-sea-100 p-6">
        <div className="flex gap-4 mb-4 border-b border-sea-100">
          <button onClick={() => setTab("posts")} className={`pb-2 text-sm ${tab === "posts" ? "text-sea-800 font-bold border-b-2 border-sea-700" : "text-slate-400"}`}>
            我的帖子 ({posts.length})
          </button>
          <button onClick={() => setTab("favs")} className={`pb-2 text-sm ${tab === "favs" ? "text-sea-800 font-bold border-b-2 border-sea-700" : "text-slate-400"}`}>
            我的收藏 ({favs.length})
          </button>
        </div>
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm border-b border-sea-50 last:border-0 pb-2">
              <Link to={`/post/${p.id}`} className="text-sea-700 hover:underline line-clamp-1">{p.title}</Link>
              <span className="text-xs text-slate-400 shrink-0 ml-3">{p.views} 浏览 · {fmtTime(p.createdAt)}</span>
            </li>
          ))}
          {list.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">暂无内容</p>}
        </ul>
      </div>
    </div>
  );
}
