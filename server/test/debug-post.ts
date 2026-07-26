import { db, schema } from "../src/db/index.js";
import { eq } from "drizzle-orm";
const p = await db.select().from(schema.posts).where(eq(schema.posts.id, 10)).get();
console.log("post10:", JSON.stringify(p));
if (p) {
  const b = await db.select().from(schema.boards).where(eq(schema.boards.id, p.boardId)).get();
  console.log("board:", JSON.stringify(b));
}
