// 构建前从数据快照生成 sitemap.xml(帖子/物种/版块/静态页),爬虫按图索骥
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, "..");
const fallback = JSON.parse(readFileSync(path.join(appRoot, "src/lib/fallback.json"), "utf-8"));

const BASE = "https://oceanheart666.dpdns.org";
const today = new Date().toISOString().slice(0, 10);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function url(loc, { lastmod, changefreq = "weekly", priority = "0.5" } = {}) {
  const lm = lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "";
  return `  <url>\n    <loc>${esc(loc)}</loc>\n${lm}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

const entries = [];

// 核心静态页
entries.push(url(`${BASE}/`, { lastmod: today, changefreq: "daily", priority: "1.0" }));
entries.push(url(`${BASE}/species`, { changefreq: "weekly", priority: "0.9" }));
entries.push(url(`${BASE}/equipment`, { changefreq: "weekly", priority: "0.8" }));
entries.push(url(`${BASE}/water`, { changefreq: "monthly", priority: "0.7" }));
entries.push(url(`${BASE}/merchants`, { changefreq: "weekly", priority: "0.6" }));

// 版块
for (const b of fallback.boards) {
  entries.push(url(`${BASE}/board/${b.slug}`, { changefreq: "daily", priority: "0.7" }));
}

// 帖子(用发帖时间做 lastmod)
for (const p of fallback.posts) {
  const lm = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : undefined;
  entries.push(url(`${BASE}/post/${p.id}`, { lastmod: lm, changefreq: "weekly", priority: p.isEssence ? "0.8" : "0.6" }));
}

// 物种详情页
for (const s of fallback.species) {
  entries.push(url(`${BASE}/species/${s.id}`, { changefreq: "monthly", priority: "0.5" }));
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

mkdirSync(path.join(appRoot, "public"), { recursive: true });
writeFileSync(path.join(appRoot, "public", "sitemap.xml"), xml);
console.log(`sitemap.xml 已生成:${entries.length} 个 URL`);
