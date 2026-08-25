// 本地模拟 Vercel @vercel/node 的两种请求形态,验证适配器:
// 1) 原始流(未消费) 2) body 已被运行时预解析(req.body 挂载、流已空)
import http from "node:http";
import handler from "../../api/trpc/[...path].js";

const LOGIN_BODY = JSON.stringify({ "0": { json: { username: "admin", password: "admin123" } } });

async function call(port: number, label: string) {
  // GET boards
  const r1 = await fetch(`http://127.0.0.1:${port}/trpc/boards.list?input=%7B%22json%22%3Anull%7D`);
  const t1 = await r1.text();
  console.log(`[${label}] boards:`, r1.status, t1.slice(0, 60));

  // POST login (batch 格式,与前端一致)
  const r2 = await fetch(`http://127.0.0.1:${port}/trpc/auth.login?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: LOGIN_BODY,
  });
  const t2 = await r2.text();
  console.log(`[${label}] login:`, r2.status, t2.slice(0, 150));
}

// 服务 1:原始 IncomingMessage 流
const srv1 = http.createServer((req, res) => void handler(req, res));
await new Promise((r) => srv1.listen(3991, r));

// 服务 2:模拟 @vercel/node —— 先消费流并挂 req.body
const srv2 = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString();
    const vreq = req as http.IncomingMessage & { body?: unknown };
    try {
      vreq.body = raw ? JSON.parse(raw) : undefined;
    } catch {
      vreq.body = raw;
    }
    void handler(req, res);
  });
});
await new Promise((r) => srv2.listen(3992, r));

await call(3991, "raw-stream");
await call(3992, "vercel-prebody");

srv1.close();
srv2.close();
console.log("VERCEL SIM TEST DONE");
process.exit(0);
