import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CATEGORY_LABEL, DIFFICULTY_LABEL, TEMPERAMENT_LABEL } from "@/lib/format";

export type Sp = {
  id: number; scientificName: string; commonNameZh: string; commonNameEn: string;
  category: string; difficulty: string; temperament: string; maxSizeCm: number | null;
  minTankL: number | null; diet: string; reefSafeCoral: number; reefSafeInvert: number;
  distribution: string; description: string; protectionLevel: string; tradeStatus: string;
};

export function SpeciesCard({ sp }: { sp: Sp }) {
  return (
    <Link
      to={`/species/${sp.id}`}
      className="bg-white rounded-lg border border-sea-100 hover:border-sea-300 hover:shadow-md transition p-4 block"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-sea-900 text-sm leading-5">{sp.commonNameZh}</h3>
        {sp.tradeStatus === "prohibited" && (
          <span className="shrink-0 flex items-center gap-0.5 text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
            <ShieldAlert className="w-3 h-3" /> 禁交易
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 italic mb-2 line-clamp-1">{sp.scientificName}</p>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="bg-sea-50 text-sea-700 px-1.5 py-0.5 rounded">{CATEGORY_LABEL[sp.category]}</span>
        <span className={`px-1.5 py-0.5 rounded ${sp.difficulty === "easy" ? "bg-emerald-50 text-emerald-600" : sp.difficulty === "expert" ? "bg-red-50 text-red-500" : "bg-sand-100 text-sand-500"}`}>
          {DIFFICULTY_LABEL[sp.difficulty]}
        </span>
        {sp.minTankL != null && <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">≥{sp.minTankL}L</span>}
        {sp.temperament && <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{TEMPERAMENT_LABEL[sp.temperament] ?? sp.temperament}</span>}
      </div>
    </Link>
  );
}

const CATS = [
  { key: "", label: "全部" },
  { key: "fish", label: "海水鱼" },
  { key: "coral", label: "珊瑚" },
  { key: "invert", label: "无脊椎" },
];
const DIFFS = [
  { key: "", label: "全部难度" },
  { key: "easy", label: "容易" },
  { key: "moderate", label: "中等" },
  { key: "hard", label: "困难" },
  { key: "expert", label: "专家级" },
];
const TANKS = [
  { key: 0, label: "不限缸体" },
  { key: 40, label: "40L 可养" },
  { key: 60, label: "60L 可养" },
  { key: 100, label: "100L 可养" },
  { key: 300, label: "300L 可养" },
];

export default function Species() {
  const [items, setItems] = useState<Sp[]>([]);
  const [cat, setCat] = useState("");
  const [diff, setDiff] = useState("");
  const [tank, setTank] = useState(0);
  const [q, setQ] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    trpc.species.categories.query().then((rows) => {
      const m: Record<string, number> = {};
      rows.forEach((r) => (m[r.category] = r.c));
      setCounts(m);
    });
  }, []);

  useEffect(() => {
    trpc.species.list
      .query({
        category: (cat || undefined) as any,
        difficulty: (diff || undefined) as any,
        minTankMax: tank || undefined,
        q: q.trim() || undefined,
      })
      .then((r) => setItems(r as Sp[]));
  }, [cat, diff, tank, q]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-sea-900">生物资料库</h1>
        <p className="text-xs text-slate-500 mt-1">
          收录海水鱼 {counts.fish ?? 0} 种 · 珊瑚 {counts.coral ?? 0} 种 · 无脊椎 {counts.invert ?? 0} 种,每条标注饲养难度/水质/兼容性/保护等级。数据基于公开文献与玩家社群资料自行整理编译。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜中文名/学名"
            className="pl-8 pr-3 py-1.5 border border-sea-200 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-sea-400"
          />
        </div>
        <div className="flex gap-1">
          {CATS.map((c) => (
            <button
              key={c.key}
              onClick={() => setCat(c.key)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${cat === c.key ? "bg-sea-700 text-white border-sea-700" : "border-sea-200 text-sea-700 bg-white"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select value={diff} onChange={(e) => setDiff(e.target.value)} className="border border-sea-200 rounded-lg text-sm px-2 py-1.5 bg-white">
          {DIFFS.map((d) => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>
        <select value={tank} onChange={(e) => setTank(Number(e.target.value))} className="border border-sea-200 rounded-lg text-sm px-2 py-1.5 bg-white">
          {TANKS.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{items.length} 个物种</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((sp) => (
          <SpeciesCard key={sp.id} sp={sp} />
        ))}
      </div>
      {items.length === 0 && <p className="text-center text-slate-400 text-sm py-10">没有匹配的物种,换个条件试试。</p>}
    </div>
  );
}
