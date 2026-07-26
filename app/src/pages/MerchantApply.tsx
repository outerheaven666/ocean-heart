import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";

export default function MerchantApply() {
  const { me, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", categories: "", licenseNo: "", wildPermitNo: "", address: "", intro: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="text-slate-400 py-10 text-center">加载中…</p>;
  if (!me)
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl border border-sea-100 p-8 text-center">
        <p className="text-slate-600 mb-4">申请商家入驻前请先登录</p>
        <Link to="/login" className="bg-sea-700 text-white px-5 py-2 rounded-lg">去登录</Link>
      </div>
    );

  const set = (k: keyof typeof form) => (e: any) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await trpc.merchants.submitApplication.mutate({
        name: form.name,
        categories: form.categories,
        licenseNo: form.licenseNo,
        wildPermitNo: form.wildPermitNo || undefined,
        address: form.address || undefined,
        intro: form.intro || undefined,
      });
      setMsg("入驻申请已提交,平台将在 3 个工作日内完成资质核验。");
      setTimeout(() => navigate("/merchants"), 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full border border-sea-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sea-400";

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-sea-100 p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-sea-900">商家入驻申请</h1>
        <p className="text-xs text-slate-500 mt-1">
          依据《电子商务法》,平台对入驻商家履行核验登记义务。经营活体生物必须提供《水生野生动物经营利用许可证》,涉及保护物种的资质从严审核。
        </p>
      </div>
      <div className="space-y-3">
        <div><label className="text-xs text-slate-500">商家名称 *</label><input className={inputCls} value={form.name} onChange={set("name")} /></div>
        <div><label className="text-xs text-slate-500">经营品类 *(如:器材/耗材/珊瑚灯具)</label><input className={inputCls} value={form.categories} onChange={set("categories")} /></div>
        <div><label className="text-xs text-slate-500">统一社会信用代码(营业执照)*</label><input className={inputCls} value={form.licenseNo} onChange={set("licenseNo")} /></div>
        <div><label className="text-xs text-slate-500">水生野生动物经营利用许可证号(经营活体必填)</label><input className={inputCls} value={form.wildPermitNo} onChange={set("wildPermitNo")} /></div>
        <div><label className="text-xs text-slate-500">经营地址</label><input className={inputCls} value={form.address} onChange={set("address")} /></div>
        <div><label className="text-xs text-slate-500">商家简介</label><textarea rows={3} className={inputCls} value={form.intro} onChange={set("intro")} /></div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      <button
        onClick={submit}
        disabled={busy || !form.name || !form.categories || form.licenseNo.length < 5}
        className="bg-sea-700 hover:bg-sea-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg transition"
      >
        {busy ? "提交中…" : "提交申请"}
      </button>
    </div>
  );
}
