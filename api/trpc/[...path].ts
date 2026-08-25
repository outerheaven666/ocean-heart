// Vercel Serverless 入口:挂载 tRPC API(路径 /api/trpc/*,经 vercel.json rewrite 承接 /trpc/*)
// 注意:必须用 Node 风格 (req, res) 签名;Web Request 签名在 @vercel/node 下会挂起。
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import { appRouter, createContext } from "../../server/src/trpc/router.js";
import { seedIfEmpty } from "../../server/src/db/seed.js";
import { db, schema, dbDebug, client } from "../../server/src/db/index.js";

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

// 诊断端点:不等待 init,随时可看初始化状态 + 实测一次数据库查询
app.get("/trpc/_diag", async (c) => {
  // 拦截 libsql 客户端发出的真实请求(脱敏),与 env 对比
  const captured: Array<Record<string, unknown>> = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      const rawHeaders = typeof input === "object" && "headers" in (input as object) ? (input as Request).headers : init?.headers;
      const hdrs: Record<string, string> = {};
      new Headers(rawHeaders as HeadersInit).forEach((v, k) => {
        hdrs[k] = k === "authorization" ? `${v.slice(0, 18)}...${v.slice(-8)} (len=${v.length})` : v;
      });
      captured.push({ url, headers: hdrs });
    } catch {
      /* ignore */
    }
    return origFetch(input as RequestInfo, init);
  }) as typeof fetch;

  let dbTest: Record<string, unknown> = null as unknown as Record<string, unknown>;
  try {
    const rows = await db.select().from(schema.boards).limit(1).all();
    dbTest = { ok: true, sampleRows: rows.length };
  } catch (e) {
    const err = e as { message?: string; code?: string; stack?: string; cause?: unknown };
    dbTest = {
      ok: false,
      message: String(err?.message),
      code: err?.code,
      stack: String(err?.stack || "").slice(0, 500),
    };
  }

  // 经模块级 client(代理)直接执行,绕过 drizzle
  let viaProxySimple: Record<string, unknown> = null as unknown as Record<string, unknown>;
  try {
    const rs = await client.execute("SELECT 1 AS one");
    viaProxySimple = { ok: true, value: rs.rows[0]?.one };
  } catch (e) {
    viaProxySimple = { ok: false, message: String((e as Error)?.message) };
  }

  // 经模块级 client(代理)执行与 drizzle 相同的 boards 查询
  let viaProxyBoards: Record<string, unknown> = null as unknown as Record<string, unknown>;
  try {
    const rs = await client.execute({
      sql: 'SELECT "id", "slug", "name", "description", "sort" FROM "boards" LIMIT ?',
      args: [1],
    });
    viaProxyBoards = { ok: true, rows: rs.rows.length };
  } catch (e) {
    viaProxyBoards = { ok: false, message: String((e as Error)?.message) };
  }

  // 新建客户端(在 fetch 拦截安装之后),对比模块级客户端
  let freshTest: Record<string, unknown> = null as unknown as Record<string, unknown>;
  try {
    const { createClient } = await import("@libsql/client/web");
    const fresh = createClient({
      url: process.env.TURSO_DATABASE_URL || "",
      authToken: process.env.TURSO_AUTH_TOKEN || "",
    });
    const rs = await fresh.execute("SELECT 1 AS one");
    freshTest = { ok: true, value: rs.rows[0]?.one };
  } catch (e) {
    const err = e as { message?: string; code?: string };
    freshTest = { ok: false, message: String(err?.message), code: err?.code };
  } finally {
    globalThis.fetch = origFetch;
  }

  // 原生 fetch 直连 Turso,绕过 libsql 客户端,看服务端原始响应
  let rawTest: Record<string, unknown> = null as unknown as Record<string, unknown>;
  try {
    const host = (process.env.TURSO_DATABASE_URL || "").replace(/^libsql:\/\//, "");
    const resp = await fetch(`https://${host}/v2/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TURSO_AUTH_TOKEN || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql: "SELECT 1" } }, { type: "close" }] }),
    });
    rawTest = { status: resp.status, body: (await resp.text()).slice(0, 120) };
  } catch (e) {
    rawTest = { exception: String(e) };
  }

  const envToken = process.env.TURSO_AUTH_TOKEN || "";
  return c.json({
    initStage,
    initError,
    dbDebug,
    dbTest,
    viaProxySimple,
    viaProxyBoards,
    freshTest,
    rawTest,
    capturedRequests: captured,
    env: {
      tursoUrl: !!process.env.TURSO_DATABASE_URL,
      urlHost: (process.env.TURSO_DATABASE_URL || "").replace(/^libsql:\/\//, "").slice(0, 70),
      tokenMask: `Bearer ${envToken.slice(0, 11)}...${envToken.slice(-8)} (len=${("Bearer " + envToken).length})`,
    },
    time: Date.now(),
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

// 调试:未匹配路由时回显 hono 实际看到的路径
app.notFound((c) =>
  c.json({ notFound: true, honoPath: c.req.path, honoUrl: c.req.url, initStage, initError }, 404)
);

// 自实现的 Node→Web 适配:完整缓冲请求体后再交给 hono。
// 原因:@hono/node-server/vercel 在 Vercel 上处理 POST 请求体时会挂起(GET 正常),
// 缓冲式转换简单可控,本站请求/响应都是小 JSON,无流式需求。
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // 诊断端点不等待 init,避免初始化卡住时连状态都看不了
    if (!(req.url || "").endsWith("/trpc/_diag")) {
      await init;
    }
    const method = req.method || "GET";
    const chunks: Buffer[] = [];
    if (method !== "GET" && method !== "HEAD") {
      for await (const chunk of req) chunks.push(chunk as Buffer);
    }
    const headers = new Headers();
    const raw = req.rawHeaders;
    for (let i = 0; i + 1 < raw.length; i += 2) headers.append(raw[i], raw[i + 1]);
    const webReq = new Request(`https://${req.headers.host || "localhost"}${req.url || "/"}`, {
      method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    });
    const webRes = await app.fetch(webReq);
    const resHeaders: Record<string, string> = {};
    webRes.headers.forEach((v, k) => {
      resHeaders[k] = v;
    });
    res.writeHead(webRes.status, resHeaders);
    res.end(Buffer.from(await webRes.arrayBuffer()));
  } catch (e) {
    console.error("[ocean-heart] handler error:", e);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String((e as Error)?.message || e) }));
  }
}
