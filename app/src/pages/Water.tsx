import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { TANK_TYPE_LABEL } from "@/lib/format";

type Row = { id: number; param: string; unit: string; tankType: string; minVal: string; maxVal: string; target: string; note: string };
const TYPES = ["reef", "fowlr", "fot", "sps"] as const;

export default function Water() {
  const [type, setType] = useState<(typeof TYPES)[number]>("reef");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    trpc.waterParams.list.query({ tankType: type }).then((r) => setRows(r as Row[]));
  }, [type]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-sea-900">水质参数速查</h1>
        <p className="text-xs text-slate-500 mt-1">11 项关键参数 × 四种缸型标准,换水/调理时随手对照。</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-1.5 rounded-lg text-sm border transition ${type === t ? "bg-sea-700 text-white border-sea-700" : "border-sea-200 text-sea-700 bg-white"}`}
          >
            {TANK_TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-sea-100 overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="bg-sea-900 text-white text-left">
              <th className="px-4 py-2.5 font-medium">参数</th>
              <th className="px-4 py-2.5 font-medium">单位</th>
              <th className="px-4 py-2.5 font-medium">安全范围</th>
              <th className="px-4 py-2.5 font-medium">目标值</th>
              <th className="px-4 py-2.5 font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-sea-50 hover:bg-sea-50/50">
                <td className="px-4 py-2.5 font-medium text-sea-900">{r.param}</td>
                <td className="px-4 py-2.5 text-slate-500">{r.unit || "—"}</td>
                <td className="px-4 py-2.5">{r.minVal} ~ {r.maxVal}</td>
                <td className="px-4 py-2.5 text-sea-700 font-medium">{r.target}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
