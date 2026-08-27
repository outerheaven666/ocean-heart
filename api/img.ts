// Vercel Serverless 入口:用户上传图片取图端点(GET /img/:id)
// 独立成单段函数的原因:Vercel 上 api/trpc/[...path].ts 实测只匹配单段路径
// (/api/trpc/boards.list 正常,/api/trpc/img/1 平台层 404),
// 因此 vercel.json 把 /img/:path* rewrite 到固定的 /api/img;
// rewrite 后函数内 req.url 仍是原始路径 /img/:id,故 Hono 路由按 /img/:id 声明。
import { Hono } from "hono";
import type { IncomingMessage, ServerResponse } from "node:http";
import { db, schema, dbReady } from "../server/src/db/index.js";
import { eq } from "drizzle-orm";

const app = new Hono();

// 用户上传的图片(内容不可变,永久 CDN 缓存)
app.get("/img/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return c.text("bad id", 400);
  const row = await db.select().from(schema.images).where(eq(schema.images.id, id)).get();
  if (!row) return c.text("图片不存在或已被删除", 404);
  return c.body(Buffer.from(row.data, "base64"), 200, {
    "content-type": row.mime,
    "cache-control": "public, max-age=31536000, immutable",
  });
});

app.notFound((c) => c.json({ notFound: true, honoPath: c.req.path }, 404));

// Node→Web 适配(与 api/trpc 同款,GET 无请求体,无需缓冲 body)
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await dbReady;
    const headers = new Headers();
    const raw = req.rawHeaders;
    for (let i = 0; i + 1 < raw.length; i += 2) headers.append(raw[i], raw[i + 1]);
    const webReq = new Request(`https://${req.headers.host || "localhost"}${req.url || "/"}`, {
      method: req.method || "GET",
      headers,
    });
    const webRes = await app.fetch(webReq);
    const resHeaders: Record<string, string> = {};
    webRes.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });
    res.writeHead(webRes.status, resHeaders);
    res.end(Buffer.from(await webRes.arrayBuffer()));
  } catch (e) {
    console.error("[ocean-heart] img handler error:", e);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String((e as Error)?.message || e) }));
  }
}
