import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ShieldCheck, Users, FileText, MessageSquare, Store } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import { fmtTime } from "@/lib/format";
import { useTitle } from "@/lib/title";

type Stats = { users: number; posts: number; comments: number; pendingMerchants: number };
type Application = {
  id: number; name: string; categories: string; licenseNo: string; wildPermitNo: string | null;
  address: string; intro: string; status: string; createdAt: number; applicant: string | null;
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "待审核", cls: "bg-sand-100 text-sand-500" },
  approved: { text: "已通过", cls: "bg-emerald-50 text-emerald-600" },
  rejected: { text: "已驳回", cls: "bg-red-50 text-red-500" },
};

export default function Admin() {
  const { me, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [msg, setMsg] = useState("");
  useTitle("管理工作台");

  const load = () => {
    trpc.admin.stats.query().then((s) => setStats(s as Stats)).catch(() => {});
    trpc.admin.merchantApplications.query().then((a) => setApps(a as Application[])).catch(() => {});
  };
  useEffect(() => {
    if (me?.role === "admin") load();
  }, [me]);

  if (loading) return <p className="text-slate-400 py-10 text-center">加载中…</p>;
  if (!me)
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl border border-sea-100 p-8 text-center">
        <p className="text-slate-600 mb-4">请先登录管理员账号</p>
        <Link to="/login" className="bg-sea-700 text-white px-5 py-2 rounded-lg">去登录</Link>
      </div>
    );
  if (me.role !== "admin")
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl border border-sea-100 p-8 text-center">
        <ShieldCheck className="w-10 h-10 text-sea-200 mx-auto mb-3" />
        <p className="text-slate-600">这里是管理员的工作台,普通玩家进不来哦。</p>
      </div>
    );

  const review = async (id: number, approve: boolean) => {
    if (!window.confirm(approve ? "确认通过这家商家的认证?" : "确认驳回这个申请?")) return;
    await trpc.admin.reviewMerchant.mutate({ id, approve });
    setMsg(approve ? "已通过,商家现在展示在认证商家页了。" : "已驳回。");
    load();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-sea-900 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-sea-600" /> 管理工作台
      </h1>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "注册用户", value: stats.users },
            { icon: FileText, label: "帖子", value: stats.posts },
            { icon: MessageSquare, label: "回帖", value: stats.comments },
            { icon: Store, label: "待审商家", value: stats.pendingMerchants },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-sea-100 p-4 text-center">
              <s.icon className="w-5 h-5 text-sea-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-sea-900">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-sea-50 border border-sea-100 rounded-xl p-4 text-xs text-sea-700">
        💡 帖子管理(设精华 / 删帖 / 删回帖)直接在帖子页面操作 —— 用管理员身份打开任意帖子,底部就能看到管理按钮。
      </div>

      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      <section className="bg-white rounded-xl border border-sea-100 p-6">
        <h2 className="font-bold text-sea-900 mb-4">商家入驻申请 ({apps.length})</h2>
        {apps.length === 0 && <p className="text-sm text-slate-400">暂时还没有商家提交申请,去社区里吆喝一声?</p>}
        <div className="space-y-4">
          {apps.map((a) => (
            <div key={a.id} className="border border-sea-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-bold text-sea-900">{a.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABEL[a.status]?.cls ?? ""}`}>
                  {STATUS_LABEL[a.status]?.text ?? a.status}
                </span>
                <span className="text-xs text-slate-400 ml-auto">
                  申请人 {a.applicant ?? "未知"} · {fmtTime(a.createdAt)}
                </span>
              </div>
              <dl className="text-xs text-slate-600 space-y-1">
                <p><span className="text-slate-400">经营品类:</span>{a.categories}</p>
                <p><span className="text-slate-400">营业执照号:</span>{a.licenseNo}</p>
                {a.wildPermitNo && <p><span className="text-slate-400">水生野生动植物经营许可:</span>{a.wildPermitNo}</p>}
                {a.address && <p><span className="text-slate-400">地址:</span>{a.address}</p>}
                {a.intro && <p><span className="text-slate-400">简介:</span>{a.intro}</p>}
              </dl>
              {a.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => review(a.id, true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-1.5 rounded-lg transition"
                  >
                    通过认证
                  </button>
                  <button
                    onClick={() => review(a.id, false)}
                    className="border border-red-200 text-red-500 hover:bg-red-50 text-xs px-4 py-1.5 rounded-lg transition"
                  >
                    驳回
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
