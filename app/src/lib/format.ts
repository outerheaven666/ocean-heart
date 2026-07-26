export function fmtTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "容易",
  moderate: "中等",
  hard: "困难",
  expert: "专家级",
};

export const CATEGORY_LABEL: Record<string, string> = {
  fish: "海水鱼",
  coral: "珊瑚",
  invert: "无脊椎动物",
};

export const TRADE_LABEL: Record<string, string> = {
  tradable: "可交易",
  restricted: "限制交易",
  prohibited: "禁止交易",
};

export const TANK_TYPE_LABEL: Record<string, string> = {
  reef: "礁岩缸",
  fowlr: "FOWLR",
  fot: "FOT 纯鱼缸",
  sps: "SPS 目标缸",
};

export const TEMPERAMENT_LABEL: Record<string, string> = {
  peaceful: "温和",
  "semi-aggressive": "半攻击性",
  aggressive: "攻击性强",
};
