import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BadgeCheck, Store } from "lucide-react";
import { getMerchants } from "@/lib/data";
import { fmtTime } from "@/lib/format";
import { useTitle } from "@/lib/title";

type M = { id: number; name: string; categories: string; address: string; intro: string; wildPermitNo: string | null; createdAt: number };

export default function Merchants() {
  const [items, setItems] = useState<M[]>([]);
  useTitle("认证商家");
  useEffect(() => {
    getMerchants().then((r) => setItems(r as M[]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-sea-900">认证商家</h1>
          <p className="text-xs text-slate-500 mt-1">
            平台履行《电商法》核验登记义务:入驻须提交营业执照,经营活体须另附《水生野生动物经营利用许可证》。现阶段仅做信息展示,不做站内交易。
          </p>
        </div>
        <Link to="/merchant/apply" className="bg-sand-400 hover:bg-sand-500 text-sea-950 text-sm font-medium px-4 py-2 rounded-lg transition">
          申请入驻
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((m) => (
          <div key={m.id} className="bg-white rounded-lg border border-sea-100 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-5 h-5 text-sea-600" />
              <h3 className="font-bold text-sea-900">{m.name}</h3>
              <span className="flex items-center gap-0.5 text-xs text-emerald-600"><BadgeCheck className="w-4 h-4" /> 已认证</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">经营品类:{m.categories}</p>
            <p className="text-sm text-slate-600 leading-6 mb-3">{m.intro}</p>
            <div className="text-xs text-slate-400 space-y-0.5 border-t border-sea-50 pt-2">
              <p>资质公示:营业执照已核验{m.wildPermitNo ? " · 水生野生动物经营利用许可证已核验" : " · 无活体经营资质"}</p>
              {m.address && <p>地址:{m.address}</p>}
              <p>入驻时间:{fmtTime(m.createdAt)}</p>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-400 py-10 text-center col-span-2">暂无认证商家</p>}
      </div>
    </div>
  );
}
