import { createClient as createNodeClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema.js";
import { RawTursoClient } from "./turso-raw.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 本地开发:SQLite 文件;生产(Vercel):Turso 云端 libsql —— 同一套 Drizzle schema 无缝切换
function resolveUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const dataDir = path.join(__dirname, "..", "..", "data");
  mkdirSync(dataDir, { recursive: true });
  return "file:" + path.join(dataDir, "ocean-heart.db").replace(/\\/g, "/");
}

const resolvedUrl = resolveUrl();
const isLocal = resolvedUrl.startsWith("file:");

// 本地 file: 用 @libsql/client Node 客户端;
// 远程:用自研 RawTursoClient(纯 fetch 直连 /v2/pipeline)——
// @libsql/client 的 hrana 客户端在 Vercel serverless 上会出现 401 状态污染,弃用。
export const client = isLocal
  ? createNodeClient({ url: resolvedUrl })
  : (new RawTursoClient(resolvedUrl, process.env.TURSO_AUTH_TOKEN || "") as unknown as ReturnType<
      typeof createNodeClient
    >);

// 模块加载时的环境快照(诊断 serverless 环境变量时机问题用)
export const dbDebug = {
  urlHead: resolvedUrl.slice(0, 50),
  isFile: isLocal,
  tokenLenAtLoad: (process.env.TURSO_AUTH_TOKEN || "").length,
  driver: isLocal ? "libsql-node" : "raw-turso",
};

// 轻量 DDL 迁移(CREATE TABLE IF NOT EXISTS),与 drizzle schema 保持一致
const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  real_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  is_essence INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS likes (user_id INTEGER NOT NULL, post_id INTEGER NOT NULL, PRIMARY KEY (user_id, post_id));
CREATE TABLE IF NOT EXISTS favorites (user_id INTEGER NOT NULL, post_id INTEGER NOT NULL, PRIMARY KEY (user_id, post_id));
CREATE TABLE IF NOT EXISTS species (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  aphia_id INTEGER,
  scientific_name TEXT NOT NULL,
  common_name_zh TEXT NOT NULL,
  common_name_en TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  temperament TEXT NOT NULL DEFAULT '',
  max_size_cm INTEGER,
  min_tank_l INTEGER,
  diet TEXT NOT NULL DEFAULT '',
  reef_safe_coral INTEGER NOT NULL DEFAULT 1,
  reef_safe_invert INTEGER NOT NULL DEFAULT 1,
  distribution TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  protection_level TEXT NOT NULL DEFAULT '无',
  trade_status TEXT NOT NULL DEFAULT 'tradable',
  detail TEXT NOT NULL DEFAULT '{}',
  data_source TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS water_params (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  param TEXT NOT NULL,
  unit TEXT NOT NULL,
  tank_type TEXT NOT NULL,
  min_val TEXT NOT NULL,
  max_val TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS equipment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  key_params TEXT NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS merchants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL,
  categories TEXT NOT NULL DEFAULT '',
  license_no TEXT NOT NULL,
  wild_permit_no TEXT,
  address TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS forum_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  species_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL
);
`;

// 数据库初始化(建表)。任何查询发生前必须 await dbReady
export const dbReady: Promise<void> = client
  .executeMultiple(DDL)
  .then(() => {})
  .catch((err) => {
    console.error("[ocean-heart] database init failed:", err);
    throw err;
  });

export const db = drizzle(client, { schema });
export { schema };
