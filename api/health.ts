// 独立健康检查:不依赖 server 代码,验证函数运行时本身 + 环境变量是否注入
export const runtime = "nodejs";

export default function handler(_req: Request) {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "ocean-heart",
      env: {
        tursoUrl: !!process.env.TURSO_DATABASE_URL,
        tursoToken: !!process.env.TURSO_AUTH_TOKEN,
        node: process.version,
      },
      time: Date.now(),
    }),
    { headers: { "content-type": "application/json" } }
  );
}
