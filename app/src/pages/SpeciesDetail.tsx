import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { getSpeciesById } from "@/lib/data";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, TRADE_LABEL, TEMPERAMENT_LABEL, fmtTime } from "@/lib/format";
import { useTitle } from "@/lib/title";

type Detail = {
  id: number; scientificName: string; commonNameZh: string; commonNameEn: string; category: string;
  difficulty: string; temperament: string; maxSizeCm: number | null; minTankL: number | null; diet: string;
  reefSafeCoral: number; reefSafeInvert: number; distribution: string; description: string;
  protectionLevel: string; tradeStatus: string; dataSource: string; aphiaId: number | null;
  imageUrl: string;
  detail: Record<string, unknown>;
  relatedPosts: { id: number; title: string; createdAt: number }[];
};

const DETAIL_LABEL: Record<string, string> = {
  swimmingLayer: "活动水层", captiveBred: "有人工繁殖", anemoneHost: "共生海葵", ichProne: "白点高发",
  feedingDifficulty: "开口难度", feedingFrequency: "喂食频率", jumpRisk: "易跳缸", utility: "工具属性",
  toxinRisk: "毒素风险", venomous: "有毒棘刺", notRecommended: "不推荐饲养", coralType: "珊瑚类型",
  lightPAR: "光照 PAR", flow: "水流需求", sweeperTentacles: "有攻击性触手", palytoxinRisk: "含毒素(操作戴手套)",
  allelopathy: "释放化感物质", fastGrowing: "生长极快", feedingRequired: "必须人工喂食", copperSensitive: "铜药敏感",
  complianceNote: "合规提示", hostFor: "宿主于", schooling: "群游性",
};

export default function SpeciesDetail() {
  const { id } = useParams();
  const [sp, setSp] = useState<Detail | null>(null);
  useTitle(sp?.commonNameZh);

  useEffect(() => {
    getSpeciesById(Number(id)).then((r) => setSp(r as unknown as Detail));
  }, [id]);

  if (!sp) return <p className="text-slate-400 py-10 text-center">加载中…</p>;

  const prohibited = sp.tradeStatus === "prohibited";
  const entries = Object.entries(sp.detail).filter(([k]) => DETAIL_LABEL[k]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white rounded-xl border border-sea-100 overflow-hidden">
        <div className="bg-gradient-to-r from-sea-900 to-sea-700 text-white p-6">
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="bg-sea-600 px-2 py-0.5 rounded">{CATEGORY_LABEL[sp.category]}</span>
            <span className={`px-2 py-0.5 rounded ${sp.difficulty === "easy" ? "bg-emerald-500" : sp.difficulty === "expert" ? "bg-red-500" : "bg-sand-400 text-sea-950"}`}>
              饲养难度:{DIFFICULTY_LABEL[sp.difficulty]}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{sp.commonNameZh}</h1>
          <p className="text-sea-200 italic text-sm mt-1">
            {sp.scientificName}
            {sp.commonNameEn && ` · ${sp.commonNameEn}`}
          </p>
        </div>

        {sp.imageUrl && (
          <img src={sp.imageUrl} alt={sp.commonNameZh} className="w-full max-h-80 object-cover bg-sea-50" />
        )}

        {prohibited && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-start gap-2 text-sm text-red-700">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">保护等级:{sp.protectionLevel} —— {TRADE_LABEL[sp.tradeStatus]}</p>
              <p className="text-xs mt-0.5">该物种受《野生动物保护法》及 CITES 公约管制,买卖双端均可能构成刑事犯罪。本页仅作科普展示,平台禁止相关交易信息。</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-5">
          <p className="text-sm leading-7 text-slate-700">{sp.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {sp.maxSizeCm != null && (
              <div className="bg-sea-50 rounded-lg p-3"><div className="text-lg font-bold text-sea-800">{sp.maxSizeCm}cm</div><div className="text-xs text-slate-500">最大体长</div></div>
            )}
            {sp.minTankL != null && (
              <div className="bg-sea-50 rounded-lg p-3"><div className="text-lg font-bold text-sea-800">≥{sp.minTankL}L</div><div className="text-xs text-slate-500">最小缸体</div></div>
            )}
            {sp.temperament && (
              <div className="bg-sea-50 rounded-lg p-3"><div className="text-lg font-bold text-sea-800">{TEMPERAMENT_LABEL[sp.temperament] ?? sp.temperament}</div><div className="text-xs text-slate-500">性情</div></div>
            )}
            <div className="bg-sea-50 rounded-lg p-3"><div className="text-lg font-bold text-sea-800 text-xs leading-6">{sp.distribution || "—"}</div><div className="text-xs text-slate-500">分布</div></div>
          </div>

          <div>
            <h3 className="font-bold text-sea-900 text-sm mb-2">兼容性(珊瑚安全/无脊椎安全独立标注)</h3>
            <div className="flex gap-3 text-sm">
              <span className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${sp.reefSafeCoral ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                {sp.reefSafeCoral ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} 珊瑚安全
              </span>
              <span className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${sp.reefSafeInvert ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                {sp.reefSafeInvert ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} 无脊椎安全
              </span>
              {!prohibited && (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sea-50 text-sea-700">
                  可交易性:{TRADE_LABEL[sp.tradeStatus]}
                </span>
              )}
            </div>
          </div>

          {sp.diet && (
            <div className="text-sm"><span className="font-bold text-sea-900">食性:</span><span className="text-slate-600">{sp.diet}</span></div>
          )}

          {entries.length > 0 && (
            <div>
              <h3 className="font-bold text-sea-900 text-sm mb-2">扩展参数</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {entries.map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-lg px-3 py-2 text-xs">
                    <div className="text-slate-400">{DETAIL_LABEL[k]}</div>
                    <div className="text-slate-700 font-medium mt-0.5">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 border-t border-sea-50 pt-3">
            数据来源:{sp.dataSource}
            {sp.aphiaId && ` · WoRMS AphiaID: ${sp.aphiaId}`}
          </p>
        </div>
      </div>

      {sp.relatedPosts.length > 0 && (
        <div className="bg-white rounded-xl border border-sea-100 p-6">
          <h2 className="font-bold text-sea-900 mb-3">社区相关讨论</h2>
          <ul className="space-y-2">
            {sp.relatedPosts.map((p) => (
              <li key={p.id}>
                <Link to={`/post/${p.id}`} className="text-sm text-sea-700 hover:underline">{p.title}</Link>
                <span className="text-xs text-slate-400 ml-2">{fmtTime(p.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
