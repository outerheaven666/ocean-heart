// 导出前端静态回退数据(GitHub Pages 无后端时使用)
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../src/db/index.js";
import { seedIfEmpty } from "../src/db/seed.js";

await seedIfEmpty();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const boards = db
  .select({
    id: schema.boards.id,
    slug: schema.boards.slug,
    name: schema.boards.name,
    description: schema.boards.description,
    sort: schema.boards.sort,
    postCount: sql<number>`(select count(*) from posts where posts.board_id = boards.id)`,
  })
  .from(schema.boards)
  .orderBy(schema.boards.sort)
  .all();

const posts = db
  .select({
    id: schema.posts.id,
    title: schema.posts.title,
    content: schema.posts.content,
    views: schema.posts.views,
    isEssence: schema.posts.isEssence,
    createdAt: schema.posts.createdAt,
    boardSlug: schema.boards.slug,
    boardName: schema.boards.name,
    author: schema.users.nickname,
    authorRole: schema.users.role,
    likeCount: sql<number>`(select count(*) from likes where likes.post_id = posts.id)`,
    commentCount: sql<number>`(select count(*) from comments where comments.post_id = posts.id)`,
  })
  .from(schema.posts)
  .innerJoin(schema.boards, eq(schema.posts.boardId, schema.boards.id))
  .innerJoin(schema.users, eq(schema.posts.userId, schema.users.id))
  .orderBy(desc(schema.posts.isEssence), desc(schema.posts.createdAt))
  .all();

const comments = db
  .select({
    id: schema.comments.id,
    postId: schema.comments.postId,
    content: schema.comments.content,
    createdAt: schema.comments.createdAt,
    author: schema.users.nickname,
    authorRole: schema.users.role,
  })
  .from(schema.comments)
  .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
  .orderBy(schema.comments.createdAt)
  .all();

const speciesRows = await db.select().from(schema.species).orderBy(schema.species.category, schema.species.id).all();
const species = speciesRows.map((sp) => {
  const first = sp.commonNameZh.split("(")[0];
  const relatedPosts = posts
    .filter((p) => p.title.includes(first) || p.content.includes(first))
    .slice(0, 10)
    .map((p) => ({ id: p.id, title: p.title, createdAt: p.createdAt }));
  return { ...sp, detail: JSON.parse(sp.detail || "{}"), relatedPosts };
});

const waterParams = await db.select().from(schema.waterParams).all();
const equipment = await db.select().from(schema.equipment).all();
const merchants = await db.select().from(schema.merchants).where(eq(schema.merchants.status, "approved")).all();

const out = { boards, posts, comments, species, waterParams, equipment, merchants };
const target = path.resolve(__dirname, "..", "..", "app", "src", "lib", "fallback.json");
writeFileSync(target, JSON.stringify(out, null, 1), "utf-8");
console.log(`fallback.json written: ${boards.length} boards, ${posts.length} posts, ${comments.length} comments, ${species.length} species, ${waterParams.length} waterParams, ${equipment.length} equipment, ${merchants.length} merchants`);
