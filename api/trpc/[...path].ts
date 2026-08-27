// Vercel Serverless 入口:挂载 tRPC API(路径 /api/trpc/*,经 vercel.json rewrite 承接 /trpc/*)
// 注意:必须用 Node 风格 (req, res) 签名;Web Request 签名在 @vercel/node 下会挂起。
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import { appRouter, createContext } from "../../server/src/trpc/router.js";
import { seedIfEmpty } from "../../server/src/db/seed.js";
import { db, schema } from "../../server/src/db/index.js";
import { eq } from "drizzle-orm";

// 冷启动初始化:建表 + 空库灌种子(只执行一次),带阶段状态便于诊断
let initStage = "created";
let initError: string | null = null;
const init: Promise<unknown> = (async () => {
  initStage = "seed:start";
  const t0 = Date.now();
  const seeded = await seedIfEmpty();
  initStage = `seed:done seeded=${seeded} ${Date.now() - t0}ms`;
})().catch((err) => {
  initError = String((err && (err.stack || err.message)) || err);
  initStage = "seed:error";
  console.error("[ocean-heart] init failed:", err);
});

// 注意:Vercel 调用函数时传入的是原始路径(/trpc/*,不含 /api 前缀),
// 且 rewrite 已把 /trpc/* 映射到本函数,因此路由直接按 /trpc/* 声明,不要 basePath("/api")。
const app = new Hono();

// 用户上传的图片(永久 CDN 缓存:内容不可变)
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

app.use("/trpc/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"] }));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    endpoint: "/trpc",
    createContext: async (_opts, c) => {
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((v, k) => (headers[k] = v));
      return await createContext(headers);
    },
  })
);

// 几乎不变的公共数据走 CDN 缓存,减少 Turso 查询、页面秒开
const CACHEABLE_GET = ["/trpc/boards.list", "/trpc/species.list", "/trpc/species.categories", "/trpc/waterParams.list", "/trpc/equipment.list", "/trpc/equipment.categories"];

// 调试:未匹配路由时回显 hono 实际看到的路径
app.notFound((c) =>
  c.json({ notFound: true, honoPath: c.req.path, initStage, initError }, 404)
);

// 自实现的 Node→Web 适配:完整缓冲请求体后再交给 hono。
// 原因:@hono/node-server/vercel 在 Vercel 上处理 POST 请求体时会挂起(GET 正常)。
// 注意:@vercel/node 默认启用 body parser,会提前消费请求流并把结果挂在
// req.body(已解析) / req.rawBody(Buffer) 上 —— 必须优先从这两个属性取,
// 否则 for await 读到的只是被掏空后的空流,POST 永远拿不到 body。
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await init;
    const method = req.method || "GET";
    let body: Buffer | undefined;
    if (method !== "GET" && method !== "HEAD") {
      const vreq = req as IncomingMessage & { rawBody?: unknown; body?: unknown };
      if (Buffer.isBuffer(vreq.rawBody)) {
        body = vreq.rawBody;
      } else if (vreq.body !== undefined && vreq.body !== null) {
        body = Buffer.from(
          typeof vreq.body === "string" ? vreq.body : JSON.stringify(vreq.body)
        );
      } else {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        if (chunks.length) body = Buffer.concat(chunks);
      }
    }
    const headers = new Headers();
    const raw = req.rawHeaders;
    for (let i = 0; i + 1 < raw.length; i += 2) headers.append(raw[i], raw[i + 1]);
    const webReq = new Request(`https://${req.headers.host || "localhost"}${req.url || "/"}`, {
      method,
      headers,
      body,
    });
    const webRes = await app.fetch(webReq);
    const resHeaders: Record<string, string> = {};
    webRes.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });
    // 公共静态数据:Vercel CDN 缓存 5 分钟,回源 1 分钟内允许陈旧缓存
    if (method === "GET" && webRes.status === 200 && CACHEABLE_GET.some((p) => (req.url || "").startsWith(p)))
      resHeaders["cache-control"] = "public, s-maxage=300, stale-while-revalidate=60";
    res.writeHead(webRes.status, resHeaders);
    res.end(Buffer.from(await webRes.arrayBuffer()));
  } catch (e) {
    console.error("[ocean-heart] handler error:", e);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String((e as Error)?.message || e) }));
  }
}
