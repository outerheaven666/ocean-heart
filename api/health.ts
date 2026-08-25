// 独立健康检查:不依赖 server 代码,验证函数运行时本身 + 环境变量是否注入
// Node 风格签名 (req, res) —— @vercel/node 默认运行时。
import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(_req: IncomingMessage, res: ServerResponse) {
  res.setHeader("content-type", "application/json");
  res.end(
    JSON.stringify({
      ok: true,
      service: "ocean-heart",
      env: {
        tursoUrl: !!process.env.TURSO_DATABASE_URL,
        tursoToken: !!process.env.TURSO_AUTH_TOKEN,
        node: process.version,
      },
      time: Date.now(),
    })
  );
}
