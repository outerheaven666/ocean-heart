// Vercel Serverless 入口:挂载 tRPC API(路径 /api/trpc/*,经 vercel.json rewrite 承接 /trpc/*)
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { handle } from "hono/vercel";
import { appRouter, createContext } from "../../server/src/trpc/router.js";
import { seedIfEmpty } from "../../server/src/db/seed.js";

// 冷启动初始化:建表 + 空库灌种子(只执行一次)
const init: Promise<unknown> = seedIfEmpty().catch((err) => {
  console.error("[ocean-heart] init failed:", err);
});

const app = new Hono().basePath("/api");

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

export const runtime = "nodejs";
export const maxDuration = 30;

export default async function handler(req: Request) {
  await init;
  return honoHandler(req);
}
