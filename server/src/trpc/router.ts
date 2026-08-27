import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";

// ---------- 上下文:解析登录态 ----------
export interface Context {
  user: typeof schema.users.$inferSelect | null;
  token: string | null;
  [key: string]: unknown;
}

const SESSION_TTL_MS = 30 * 86400_000; // 会话 30 天有效

export async function createContext(headers: Record<string, string | string[] | undefined>): Promise<Context> {
  const auth = headers["authorization"];
  const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { user: null, token: null };
  const row = await db
    .select({ user: schema.users, sessionCreatedAt: schema.sessions.createdAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.token, token))
    .get();
  if (!row) return { user: null, token: null };
  // 会话过期:作废并视为未登录
  if (Date.now() - row.sessionCreatedAt > SESSION_TTL_MS) {
    await db.delete(schema.sessions).where(eq(schema.sessions.token, token)).run();
    return { user: null, token: null };
  }
  return { user: row.user, token };
}

const t = initTRPC.context<Context>().create();
const publicProc = t.procedure;
const authedProc = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
// 管理员专属操作
const adminProc = authedProc.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  return next({ ctx });
});
// 跟帖评论后台实名制:未实名禁止发帖/回帖
const verifiedProc = authedProc.use(({ ctx, next }) => {
  if (!ctx.user.realName)
    throw new TRPCError({ code: "FORBIDDEN", message: "按社区合规要求,请先在个人中心完成实名登记后再发帖/回帖" });
  return next({ ctx });
});

function hashPassword(password: string, salt: string) {
  return scryptSync(password, salt, 32).toString("hex");
}

// 二手置换版块敏感词库(保护物种先审后发规则)
const TRADE_BANNED_WORDS = [
  "砗磲", "五爪贝", "石珊瑚", "鹿角珊瑚", "脑珊瑚", "榔头", "蛙卵珊瑚",
  "海马", "海龟", "sps", "lps", "硬骨", "cites",
];

async function checkTradeCompliance(boardId: number, text: string) {
  const board = await db.select().from(schema.boards).where(eq(schema.boards.id, boardId)).get();
  if (board?.slug !== "trade") return;
  const lower = text.toLowerCase();
  const hit = TRADE_BANNED_WORDS.find((w) => lower.includes(w.toLowerCase()));
  if (hit)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `合规审核:内容包含保护物种相关关键词「${hit}」。石珊瑚目/砗磲/海马等属国家重点保护野生动物,平台禁止发布相关交易信息。`,
    });
}

const PAGE_SIZE = 20;

// 登录限流:同一用户名 10 分钟内最多失败 5 次(内存计数,Serverless 冷启动自动重置,足够挡住脚本爆破)
const loginFails = new Map<string, { count: number; resetAt: number }>();
function checkLoginThrottle(username: string) {
  const rec = loginFails.get(username);
  if (rec && rec.resetAt > Date.now() && rec.count >= 5)
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "尝试次数太多啦,喝口水休息一下,10 分钟后再试" });
}
function recordLoginFail(username: string) {
  const rec = loginFails.get(username);
  if (!rec || rec.resetAt <= Date.now()) loginFails.set(username, { count: 1, resetAt: Date.now() + 600_000 });
  else rec.count += 1;
}

export const appRouter = t.router({
  // ---------- 认证与个人中心 ----------
  auth: t.router({
    register: publicProc
      .input(z.object({ username: z.string().min(3).max(20), password: z.string().min(6), nickname: z.string().min(1).max(20) }))
      .mutation(async ({ input }) => {
        const exists = await db.select().from(schema.users).where(eq(schema.users.username, input.username)).get();
        if (exists) throw new TRPCError({ code: "CONFLICT", message: "用户名已存在" });
        const salt = randomBytes(8).toString("hex");
        const id = Number((await db
          .insert(schema.users)
          .values({ username: input.username, passwordHash: `${salt}:${hashPassword(input.password, salt)}`, nickname: input.nickname, createdAt: Date.now() })
          .run()).lastInsertRowid);
        const token = randomBytes(24).toString("hex");
        await db.insert(schema.sessions).values({ token, userId: id, createdAt: Date.now() }).run();
        return { token, user: { id, username: input.username, nickname: input.nickname, role: "user" as const, realName: null } };
      }),
    login: publicProc
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        checkLoginThrottle(input.username);
        const user = await db.select().from(schema.users).where(eq(schema.users.username, input.username)).get();
        const bad = new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
        if (!user) {
          recordLoginFail(input.username);
          throw bad;
        }
        const [salt, stored] = user.passwordHash.split(":");
        const candidate = hashPassword(input.password, salt);
        const ok = timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(candidate, "hex"));
        if (!ok) {
          recordLoginFail(input.username);
          throw bad;
        }
        loginFails.delete(input.username);
        const token = randomBytes(24).toString("hex");
        await db.insert(schema.sessions).values({ token, userId: user.id, createdAt: Date.now() }).run();
        return { token, user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role, realName: user.realName } };
      }),
    logout: authedProc.mutation(async ({ ctx }) => {
      if (ctx.token) await db.delete(schema.sessions).where(eq(schema.sessions.token, ctx.token)).run();
      return { ok: true };
    }),
    changePassword: authedProc
      .input(z.object({ oldPassword: z.string(), newPassword: z.string().min(8, "新密码至少 8 位,建议字母+数字组合") }))
      .mutation(async ({ ctx, input }) => {
        const [salt, stored] = ctx.user.passwordHash.split(":");
        const candidate = hashPassword(input.oldPassword, salt);
        if (!timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(candidate, "hex")))
          throw new TRPCError({ code: "UNAUTHORIZED", message: "原密码不对哦,再想想?" });
        const newSalt = randomBytes(8).toString("hex");
        await db
          .update(schema.users)
          .set({ passwordHash: `${newSalt}:${hashPassword(input.newPassword, newSalt)}` })
          .where(eq(schema.users.id, ctx.user.id))
          .run();
        // 改密后作废该用户所有旧会话,只保留当前这个
        await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, ctx.user.id), sql`${schema.sessions.token} != ${ctx.token}`)).run();
        return { ok: true };
      }),
    me: authedProc.query(async ({ ctx }) => {
      const { id, username, nickname, role, realName, createdAt } = ctx.user;
      return { id, username, nickname, role, realName, createdAt };
    }),
    setRealName: authedProc.input(z.object({ realName: z.string().min(2).max(30) })).mutation(async ({ ctx, input }) => {
      await db.update(schema.users).set({ realName: input.realName }).where(eq(schema.users.id, ctx.user.id)).run();
      return { ok: true };
    }),
  }),

  // ---------- 版块 ----------
  boards: t.router({
    list: publicProc.query(async () =>
      db
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
        .all()
    ),
  }),

  // ---------- 帖子 ----------
  posts: t.router({
    list: publicProc
      .input(z.object({ boardSlug: z.string().optional(), q: z.string().optional(), page: z.number().min(1).default(1) }))
      .query(async ({ input }) => {
        const conds = [];
        if (input.boardSlug) {
          const board = await db.select().from(schema.boards).where(eq(schema.boards.slug, input.boardSlug)).get();
          if (!board) return { items: [], total: 0, page: input.page, pageSize: PAGE_SIZE };
          conds.push(eq(schema.posts.boardId, board.id));
        }
        if (input.q) conds.push(or(like(schema.posts.title, `%${input.q}%`), like(schema.posts.content, `%${input.q}%`)));
        const where = conds.length ? and(...conds) : undefined;
        const total = (await db.select({ c: sql<number>`count(*)` }).from(schema.posts).where(where).get())?.c ?? 0;
        const items = await db
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
            likeCount: sql<number>`(select count(*) from likes where likes.post_id = posts.id)`,
            commentCount: sql<number>`(select count(*) from comments where comments.post_id = posts.id)`,
          })
          .from(schema.posts)
          .innerJoin(schema.boards, eq(schema.posts.boardId, schema.boards.id))
          .innerJoin(schema.users, eq(schema.posts.userId, schema.users.id))
          .where(where)
          .orderBy(desc(schema.posts.isEssence), desc(schema.posts.createdAt))
          .limit(PAGE_SIZE)
          .offset((input.page - 1) * PAGE_SIZE)
          .all();
        return { items, total, page: input.page, pageSize: PAGE_SIZE };
      }),
    byId: publicProc.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const post = await db
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
        })
        .from(schema.posts)
        .innerJoin(schema.boards, eq(schema.posts.boardId, schema.boards.id))
        .innerJoin(schema.users, eq(schema.posts.userId, schema.users.id))
        .where(eq(schema.posts.id, input.id))
        .get();
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "帖子不存在" });
      const liked = ctx.user
        ? !!(await db.select().from(schema.likes).where(and(eq(schema.likes.userId, ctx.user.id), eq(schema.likes.postId, input.id))).get())
        : false;
      const favorited = ctx.user
        ? !!(await db.select().from(schema.favorites).where(and(eq(schema.favorites.userId, ctx.user.id), eq(schema.favorites.postId, input.id))).get())
        : false;
      return { ...post, liked, favorited };
    }),
    // 浏览量单独计数:前端同一浏览器会话只对同一帖调一次,避免刷新/点赞刷量
    view: publicProc.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.update(schema.posts).set({ views: sql`${schema.posts.views} + 1` }).where(eq(schema.posts.id, input.id)).run();
      return { ok: true };
    }),
    create: verifiedProc
      .input(z.object({ boardSlug: z.string(), title: z.string().min(2).max(80), content: z.string().min(5).max(20000) }))
      .mutation(async ({ ctx, input }) => {
        const board = await db.select().from(schema.boards).where(eq(schema.boards.slug, input.boardSlug)).get();
        if (!board) throw new TRPCError({ code: "NOT_FOUND", message: "版块不存在" });
        await checkTradeCompliance(board.id, input.title + "\n" + input.content);
        const id = Number((await db
          .insert(schema.posts)
          .values({ boardId: board.id, userId: ctx.user.id, title: input.title, content: input.content, createdAt: Date.now() })
          .run()).lastInsertRowid);
        return { id };
      }),
    toggleLike: authedProc.input(z.object({ postId: z.number() })).mutation(async ({ ctx, input }) => {
      const existing = await db.select().from(schema.likes).where(and(eq(schema.likes.userId, ctx.user.id), eq(schema.likes.postId, input.postId))).get();
      if (existing) await db.delete(schema.likes).where(and(eq(schema.likes.userId, ctx.user.id), eq(schema.likes.postId, input.postId))).run();
      else await db.insert(schema.likes).values({ userId: ctx.user.id, postId: input.postId }).run();
      return { liked: !existing };
    }),
    toggleFavorite: authedProc.input(z.object({ postId: z.number() })).mutation(async ({ ctx, input }) => {
      const existing = await db.select().from(schema.favorites).where(and(eq(schema.favorites.userId, ctx.user.id), eq(schema.favorites.postId, input.postId))).get();
      if (existing) await db.delete(schema.favorites).where(and(eq(schema.favorites.userId, ctx.user.id), eq(schema.favorites.postId, input.postId))).run();
      else await db.insert(schema.favorites).values({ userId: ctx.user.id, postId: input.postId }).run();
      return { favorited: !existing };
    }),
    mine: authedProc.query(async ({ ctx }) =>
      db
        .select({ id: schema.posts.id, title: schema.posts.title, createdAt: schema.posts.createdAt, views: schema.posts.views })
        .from(schema.posts)
        .where(eq(schema.posts.userId, ctx.user.id))
        .orderBy(desc(schema.posts.createdAt))
        .all()
    ),
    myFavorites: authedProc.query(async ({ ctx }) =>
      db
        .select({ id: schema.posts.id, title: schema.posts.title, createdAt: schema.posts.createdAt, views: schema.posts.views })
        .from(schema.favorites)
        .innerJoin(schema.posts, eq(schema.favorites.postId, schema.posts.id))
        .where(eq(schema.favorites.userId, ctx.user.id))
        .orderBy(desc(schema.posts.createdAt))
        .all()
    ),
  }),

  // ---------- 评论 ----------
  comments: t.router({
    list: publicProc.input(z.object({ postId: z.number() })).query(async ({ input }) =>
      db
        .select({ id: schema.comments.id, content: schema.comments.content, createdAt: schema.comments.createdAt, author: schema.users.nickname, authorRole: schema.users.role })
        .from(schema.comments)
        .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
        .where(eq(schema.comments.postId, input.postId))
        .orderBy(schema.comments.createdAt)
        .all()
    ),
    create: verifiedProc
      .input(z.object({ postId: z.number(), content: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.select().from(schema.posts).where(eq(schema.posts.id, input.postId)).get();
        if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "帖子不存在" });
        await checkTradeCompliance(post.boardId, input.content);
        const id = Number((await db.insert(schema.comments).values({ postId: input.postId, userId: ctx.user.id, content: input.content, createdAt: Date.now() }).run()).lastInsertRowid);
        return { id };
      }),
  }),

  // ---------- 生物资料库 ----------
  species: t.router({
    list: publicProc
      .input(
        z.object({
          category: z.enum(["fish", "coral", "invert"]).optional(),
          difficulty: z.enum(["easy", "moderate", "hard", "expert"]).optional(),
          tradeStatus: z.enum(["tradable", "restricted", "prohibited"]).optional(),
          minTankMax: z.number().optional(), // 我家缸多大:筛选 minTankL <= 该值
          q: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const conds = [];
        if (input.category) conds.push(eq(schema.species.category, input.category));
        if (input.difficulty) conds.push(eq(schema.species.difficulty, input.difficulty));
        if (input.tradeStatus) conds.push(eq(schema.species.tradeStatus, input.tradeStatus));
        if (input.minTankMax) conds.push(sql`${schema.species.minTankL} <= ${input.minTankMax}`);
        if (input.q)
          conds.push(
            or(
              like(schema.species.commonNameZh, `%${input.q}%`),
              like(schema.species.commonNameEn, `%${input.q}%`),
              like(schema.species.scientificName, `%${input.q}%`)
            )
          );
        return await db.select().from(schema.species).where(conds.length ? and(...conds) : undefined).orderBy(schema.species.category, schema.species.id).all();
      }),
    byId: publicProc.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const sp = await db.select().from(schema.species).where(eq(schema.species.id, input.id)).get();
      if (!sp) throw new TRPCError({ code: "NOT_FOUND", message: "物种不存在" });
      // 资料卡与论坛帖双向联动:聚合标题/内容提及该物种的帖子
      const related = await db
        .select({ id: schema.posts.id, title: schema.posts.title, createdAt: schema.posts.createdAt })
        .from(schema.posts)
        .where(or(like(schema.posts.title, `%${sp.commonNameZh.split("(")[0]}%`), like(schema.posts.content, `%${sp.commonNameZh.split("(")[0]}%`)))
        .limit(10)
        .all();
      return { ...sp, detail: JSON.parse(sp.detail || "{}"), relatedPosts: related };
    }),
    categories: publicProc.query(async () => {
      const rows = await db.select({ category: schema.species.category, c: sql<number>`count(*)` }).from(schema.species).groupBy(schema.species.category).all();
      return rows;
    }),
  }),

  // ---------- 水质速查 ----------
  waterParams: t.router({
    list: publicProc.input(z.object({ tankType: z.enum(["reef", "fowlr", "fot", "sps"]).optional() })).query(async ({ input }) =>
      await db.select().from(schema.waterParams).where(input.tankType ? eq(schema.waterParams.tankType, input.tankType) : undefined).all()
    ),
  }),

  // ---------- 设备资料库 ----------
  equipment: t.router({
    list: publicProc.input(z.object({ category: z.string().optional() })).query(async ({ input }) =>
      await db.select().from(schema.equipment).where(input.category ? eq(schema.equipment.category, input.category) : undefined).all()
    ),
    categories: publicProc.query(async () =>
      await db.select({ category: schema.equipment.category, c: sql<number>`count(*)` }).from(schema.equipment).groupBy(schema.equipment.category).all()
    ),
  }),

  // ---------- 商家入驻与展示 ----------
  merchants: t.router({
    list: publicProc.query(async () =>
      await db.select().from(schema.merchants).where(eq(schema.merchants.status, "approved")).orderBy(desc(schema.merchants.createdAt)).all()
    ),
    byId: publicProc.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const m = await db.select().from(schema.merchants).where(and(eq(schema.merchants.id, input.id), eq(schema.merchants.status, "approved"))).get();
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "商家不存在或未通过认证" });
      return m;
    }),
    submitApplication: authedProc
      .input(
        z.object({
          name: z.string().min(2).max(50),
          categories: z.string().min(1).max(100),
          licenseNo: z.string().min(5).max(50),
          wildPermitNo: z.string().max(50).optional(),
          address: z.string().max(200).optional(),
          intro: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = Number((await db
          .insert(schema.merchants)
          .values({ userId: ctx.user.id, name: input.name, categories: input.categories, licenseNo: input.licenseNo, wildPermitNo: input.wildPermitNo ?? null, address: input.address ?? "", intro: input.intro ?? "", createdAt: Date.now() })
          .run()).lastInsertRowid);
        return { id, status: "pending" as const };
      }),
    myApplication: authedProc.query(async ({ ctx }) =>
      await db.select().from(schema.merchants).where(eq(schema.merchants.userId, ctx.user.id)).orderBy(desc(schema.merchants.createdAt)).limit(1).get() ?? null
    ),
  }),

  // ---------- 管理后台(仅 admin) ----------
  admin: t.router({
    // 总览计数
    stats: adminProc.query(async () => {
      const count = async (table: any) => (await db.select({ c: sql<number>`count(*)` }).from(table).get())?.c ?? 0;
      return {
        users: await count(schema.users),
        posts: await count(schema.posts),
        comments: await count(schema.comments),
        pendingMerchants: (await db.select({ c: sql<number>`count(*)` }).from(schema.merchants).where(eq(schema.merchants.status, "pending")).get())?.c ?? 0,
      };
    }),
    // 设/撤精华
    setEssence: adminProc.input(z.object({ postId: z.number(), isEssence: z.boolean() })).mutation(async ({ input }) => {
      await db.update(schema.posts).set({ isEssence: input.isEssence ? 1 : 0 }).where(eq(schema.posts.id, input.postId)).run();
      return { ok: true };
    }),
    // 删帖(连带清理评论/点赞/收藏)
    deletePost: adminProc.input(z.object({ postId: z.number() })).mutation(async ({ input }) => {
      await db.delete(schema.comments).where(eq(schema.comments.postId, input.postId)).run();
      await db.delete(schema.likes).where(eq(schema.likes.postId, input.postId)).run();
      await db.delete(schema.favorites).where(eq(schema.favorites.postId, input.postId)).run();
      await db.delete(schema.posts).where(eq(schema.posts.id, input.postId)).run();
      return { ok: true };
    }),
    // 删评论
    deleteComment: adminProc.input(z.object({ commentId: z.number() })).mutation(async ({ input }) => {
      await db.delete(schema.comments).where(eq(schema.comments.id, input.commentId)).run();
      return { ok: true };
    }),
    // 商家审核:全部申请列表 + 通过/驳回
    merchantApplications: adminProc.query(async () =>
      await db
        .select({
          id: schema.merchants.id,
          name: schema.merchants.name,
          categories: schema.merchants.categories,
          licenseNo: schema.merchants.licenseNo,
          wildPermitNo: schema.merchants.wildPermitNo,
          address: schema.merchants.address,
          intro: schema.merchants.intro,
          status: schema.merchants.status,
          createdAt: schema.merchants.createdAt,
          applicant: schema.users.nickname,
        })
        .from(schema.merchants)
        .leftJoin(schema.users, eq(schema.merchants.userId, schema.users.id))
        .orderBy(desc(schema.merchants.createdAt))
        .all()
    ),
    reviewMerchant: adminProc
      .input(z.object({ id: z.number(), approve: z.boolean() }))
      .mutation(async ({ input }) => {
        const m = await db.select().from(schema.merchants).where(eq(schema.merchants.id, input.id)).get();
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "申请不存在" });
        await db.update(schema.merchants).set({ status: input.approve ? "approved" : "rejected" }).where(eq(schema.merchants.id, input.id)).run();
        // 通过后把申请人角色升级为 merchant
        if (input.approve && m.userId)
          await db.update(schema.users).set({ role: "merchant" }).where(eq(schema.users.id, m.userId)).run();
        return { ok: true, status: input.approve ? "approved" : "rejected" };
      }),
  }),
});

export type AppRouter = typeof appRouter;
