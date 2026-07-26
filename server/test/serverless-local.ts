// 本地模拟 Vercel serverless 调用
import handler from "../../api/trpc/[...path].js";

const r1 = await handler(new Request("https://test.local/api/health"));
console.log("health:", r1.status, await r1.text());

const r2 = await handler(new Request("https://test.local/api/trpc/boards.list"));
const body = (await r2.text()).slice(0, 120);
console.log("boards:", r2.status, body);

const r3 = await handler(
  new Request("https://test.local/api/trpc/auth.login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  })
);
const login = JSON.parse(await r3.text());
console.log("login:", r3.status, login.result?.data?.user?.username ?? login.error?.message);
console.log("SERVERLESS LOCAL TEST DONE");
