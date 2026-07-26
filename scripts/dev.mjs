// 同时启动后端(Hono+tRPC, :3001)与前端(Vite dev),并把 CLI 的 --port/--host 参数转发给 Vite
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const extraArgs = process.argv.slice(2); // 例:--port 7100 --host 0.0.0.0

const server = spawn("npm", ["--prefix", "server", "run", "start"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

const vite = spawn("npm", ["--prefix", "app", "run", "dev", "--", ...extraArgs], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

function shutdown(code = 0) {
  for (const p of [server, vite]) {
    try {
      if (p && !p.killed) process.kill(p.pid, "SIGTERM");
    } catch {}
  }
  // Windows 下 shell:true 的子进程需要 taskkill 才能带走到孙进程
  try {
    spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { shell: true, stdio: "ignore" });
    spawn("taskkill", ["/pid", String(vite.pid), "/t", "/f"], { shell: true, stdio: "ignore" });
  } catch {}
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
server.on("exit", (code) => code && shutdown(code));
vite.on("exit", (code) => code && shutdown(code));
