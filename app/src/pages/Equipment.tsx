import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

type Eq = { id: number; category: string; brand: string; model: string; keyParams: string; description: string };

export default function Equipment() {
  const [cats, setCats] = useState<{ category: string; c: number }[]>([]);
  const [cat, setCat] = useState("");
  const [items, setItems] = useState<Eq[]>([]);

  useEffect(() => {
    trpc.equipment.categories.query().then((r) => setCats(r));
  }, []);
  useEffect(() => {
    trpc.equipment.list.query({ category: cat || undefined }).then((r) => setItems(r as Eq[]));
  }, [cat]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-sea-900">设备资料库</h1>
        <p className="text-xs text-slate-500 mt-1">8 大品类主流型号与选购参数,拒绝设备选购噪音。</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCat("")}
          className={`px-3 py-1.5 rounded-lg text-sm border transition ${cat === "" ? "bg-sea-700 text-white border-sea-700" : "border-sea-200 text-sea-700 bg-white"}`}
        >
          全部
        </button>
        {cats.map((c) => (
          <button
            key={c.category}
            onClick={() => setCat(c.category)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${cat === c.category ? "bg-sea-700 text-white border-sea-700" : "border-sea-200 text-sea-700 bg-white"}`}
          >
            {c.category} ({c.c})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((e) => (
          <div key={e.id} className="bg-white rounded-lg border border-sea-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-sea-100 text-sea-700 text-xs px-2 py-0.5 rounded">{e.category}</span>
              <span className="text-xs text-slate-400">{e.brand}</span>
            </div>
            <h3 className="font-semibold text-sea-900 text-sm mb-2">{e.model}</h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(JSON.parse(e.keyParams || "{}")).map(([k, v]) => (
                <span key={k} className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {k}: {String(v)}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-600 leading-5">{e.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
