// Vercel Serverless 入口:挂载 tRPC API(路径 /api/trpc/*,经 vercel.json rewrite 承接 /trpc/*)
// 注意:必须使用 @hono/node-server/vercel 的 Node 风格 (req, res) 适配器;
// hono/vercel 的 Web Request 签名只适用于 Edge 运行时,在 Node 运行时下会挂起。
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { handle } from "@hono/node-server/vercel";
import type { IncomingMessage, ServerResponse } from "node:http";
import { appRouter, createContext } from "../../server/src/trpc/router.js";
import { seedIfEmpty } from "../../server/src/db/seed.js";

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

const app = new Hono().basePath("/api");

// 诊断端点:不等待 init,随时可看初始化进行到哪一步
app.get("/trpc/_diag", (c) =>
  c.json({
    initStage,
    initError,
    env: { tursoUrl: !!process.env.TURSO_DATABASE_URL, tursoToken: !!process.env.TURSO_AUTH_TOKEN },
    time: Date.now(),
  })
);

app.use("/trpc/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"] }));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    endpoint: "/api/trpc",
    createContext: async (_opts, c) => {
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((v, k) => (headers[k] = v));
      return await createContext(headers);
    },
  })
);

app.get("/health", (c) => c.json({ ok: true, service: "ocean-heart", mode: "vercel-serverless", time: Date.now() }));

const honoHandler = handle(app);

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // 诊断端点不等待 init,避免初始化卡住时连状态都看不了
  if (!(req.url || "").endsWith("/trpc/_diag")) {
    await init;
  }
  return honoHandler(req, res);
}
