import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { appRouter, createContext } from "./trpc/router.js";
import { seedIfEmpty } from "./db/seed.js";
import { dbReady, db, schema } from "./db/index.js";
import { eq } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

// 启动时自动灌入种子数据(库为空时)
await dbReady;
if (await seedIfEmpty()) console.log("[ocean-heart] database seeded on boot");

const app = new Hono();

app.use(
  "/trpc/*",
  cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"] })
);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (_opts, c) => {
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((v, k) => (headers[k] = v));
      return await createContext(headers);
    },
  })
);

app.get("/api/health", (c) => c.json({ ok: true, service: "ocean-heart", time: Date.now() }));

// 用户上传的图片(本地模式同样可用)
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

// 生产模式:托管前端构建产物
const clientDist = path.resolve(__dirname, "..", "..", "app", "dist");
if (fs.existsSync(clientDist)) {
  app.use("/*", serveStatic({ root: clientDist }));
  app.get("*", serveStatic({ path: path.join(clientDist, "index.html") }));
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[ocean-heart] server listening on http://localhost:${info.port}`);
});
