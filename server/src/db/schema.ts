import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

// ---------- 用户(跟帖评论后台实名制:realName 为空则禁止发帖) ----------
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nickname: text("nickname").notNull(),
  realName: text("real_name"), // 后台实名,前台不展示
  role: text("role", { enum: ["user", "admin", "merchant"] }).notNull().default("user"),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

// ---------- 论坛 ----------
export const boards = sqliteTable("boards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  boardId: integer("board_id").notNull(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  views: integer("views").notNull().default(0),
  isEssence: integer("is_essence").notNull().default(0), // 精华帖(种子内容)
  createdAt: integer("created_at").notNull(),
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const likes = sqliteTable(
  "likes",
  { userId: integer("user_id").notNull(), postId: integer("post_id").notNull() },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })]
);

export const favorites = sqliteTable(
  "favorites",
  { userId: integer("user_id").notNull(), postId: integer("post_id").notNull() },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })]
);

// ---------- 生物资料库(合并 taxon/common_name/species_profile/各 detail 为单卡 + JSON 扩展) ----------
export const species = sqliteTable("species", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  aphiaId: integer("aphia_id"), // WoRMS 锚点
  scientificName: text("scientific_name").notNull(),
  commonNameZh: text("common_name_zh").notNull(),
  commonNameEn: text("common_name_en").notNull().default(""),
  category: text("category", { enum: ["fish", "coral", "invert"] }).notNull(),
  difficulty: text("difficulty", { enum: ["easy", "moderate", "hard", "expert"] }).notNull(),
  temperament: text("temperament").notNull().default(""), // 性情枚举: peaceful/semi-aggressive/aggressive
  maxSizeCm: integer("max_size_cm"),
  minTankL: integer("min_tank_l"),
  diet: text("diet").notNull().default(""),
  reefSafeCoral: integer("reef_safe_coral").notNull().default(1), // 珊瑚安全(拆分标注)
  reefSafeInvert: integer("reef_safe_invert").notNull().default(1), // 无脊椎安全
  distribution: text("distribution").notNull().default(""),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  protectionLevel: text("protection_level").notNull().default("无"), // 合规护城河字段
  tradeStatus: text("trade_status", { enum: ["tradable", "restricted", "prohibited"] })
    .notNull()
    .default("tradable"), // 可交易性
  detail: text("detail").notNull().default("{}"), // 类别扩展字段 JSON(食性/光照PAR/铜药敏感等)
  dataSource: text("data_source").notNull().default(""), // 字段级溯源
});

// ---------- 水质标准(11 参数 x 4 缸型) ----------
export const waterParams = sqliteTable("water_params", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  param: text("param").notNull(), // 温度/盐度/pH/KH/钙/镁/硝酸盐/磷酸盐/氨/亚硝酸盐/溶氧
  unit: text("unit").notNull(),
  tankType: text("tank_type", { enum: ["reef", "fowlr", "fot", "sps"] }).notNull(),
  minVal: text("min_val").notNull(),
  maxVal: text("max_val").notNull(),
  target: text("target").notNull().default(""),
  note: text("note").notNull().default(""),
});

// ---------- 设备资料库 ----------
export const equipment = sqliteTable("equipment", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(), // 蛋分/主泵/造浪/灯具/RO机/钙反/滴定/检疫缸
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  keyParams: text("key_params").notNull().default("{}"), // JSON 选购参数
  description: text("description").notNull().default(""),
});

// ---------- 商家(入驻申请 -> 资质核验 -> 认证展示) ----------
export const merchants = sqliteTable("merchants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  name: text("name").notNull(),
  categories: text("categories").notNull().default(""), // 经营品类
  licenseNo: text("license_no").notNull(), // 营业执照号
  wildPermitNo: text("wild_permit_no"), // 水生野生动物经营利用许可证(活体类必须)
  address: text("address").notNull().default(""),
  intro: text("intro").notNull().default(""),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: integer("created_at").notNull(),
});

// ---------- 资料卡与论坛帖双向联动 ----------
export const forumLinks = sqliteTable("forum_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  speciesId: integer("species_id").notNull(),
  postId: integer("post_id").notNull(),
});
