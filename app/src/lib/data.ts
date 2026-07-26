// 数据访问层:优先走 tRPC 后端,接口不可达(如 GitHub Pages 纯静态部署)时回退到内置种子数据快照
import { trpc } from "./trpc";
import fallback from "./fallback.json";

type FB = typeof fallback;

let fallbackUsed = false;
export function isFallbackMode() {
  return fallbackUsed;
}

async function withFallback<T>(remote: () => Promise<T>, local: () => unknown): Promise<T> {
  try {
    return await remote();
  } catch {
    fallbackUsed = true;
    return local() as T;
  }
}

const PAGE_SIZE = 20;

// ---------- 版块 ----------
export function getBoards() {
  return withFallback(
    () => trpc.boards.list.query(),
    () => fallback.boards
  );
}

// ---------- 帖子 ----------
export function getPosts(input: { boardSlug?: string; q?: string; page?: number }) {
  const page = input.page ?? 1;
  return withFallback(
    () => trpc.posts.list.query({ boardSlug: input.boardSlug, q: input.q, page }),
    () => {
      let items = fallback.posts as FB["posts"];
      if (input.boardSlug) items = items.filter((p) => p.boardSlug === input.boardSlug);
      if (input.q) {
        const q = input.q.toLowerCase();
        items = items.filter((p) => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
      }
      const total = items.length;
      return { items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, page, pageSize: PAGE_SIZE };
    }
  );
}

export function getPost(id: number) {
  return withFallback(
    () => trpc.posts.byId.query({ id }),
    () => {
      const p = fallback.posts.find((x) => x.id === id);
      if (!p) throw new Error("帖子不存在");
      return { ...p, liked: false, favorited: false };
    }
  );
}

export function getComments(postId: number) {
  return withFallback(
    () => trpc.comments.list.query({ postId }),
    () => fallback.comments.filter((c) => c.postId === postId)
  );
}

// ---------- 生物资料库 ----------
export function getSpeciesCategories() {
  return withFallback(
    () => trpc.species.categories.query(),
    () => {
      const m = new Map<string, number>();
      fallback.species.forEach((s) => m.set(s.category, (m.get(s.category) ?? 0) + 1));
      return Array.from(m, ([category, c]) => ({ category, c }));
    }
  );
}

export function getSpeciesList(input: {
  category?: "fish" | "coral" | "invert";
  difficulty?: "easy" | "moderate" | "hard" | "expert";
  tradeStatus?: "tradable" | "restricted" | "prohibited";
  minTankMax?: number;
  q?: string;
}) {
  return withFallback(
    () => trpc.species.list.query(input),
    () =>
      fallback.species.filter((s) => {
        if (input.category && s.category !== input.category) return false;
        if (input.difficulty && s.difficulty !== input.difficulty) return false;
        if (input.tradeStatus && s.tradeStatus !== input.tradeStatus) return false;
        if (input.minTankMax && (s.minTankL ?? Infinity) > input.minTankMax) return false;
        if (input.q) {
          const q = input.q.toLowerCase();
          const hay = `${s.commonNameZh} ${s.commonNameEn} ${s.scientificName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
  );
}

export function getSpeciesById(id: number) {
  return withFallback(
    () => trpc.species.byId.query({ id }),
    () => {
      const sp = fallback.species.find((x) => x.id === id);
      if (!sp) throw new Error("物种不存在");
      return sp;
    }
  );
}

// ---------- 水质速查 ----------
export function getWaterParams(tankType?: "reef" | "fowlr" | "fot" | "sps") {
  return withFallback(
    () => trpc.waterParams.list.query({ tankType }),
    () => (tankType ? fallback.waterParams.filter((r) => r.tankType === tankType) : fallback.waterParams)
  );
}

// ---------- 设备资料库 ----------
export function getEquipmentCategories() {
  return withFallback(
    () => trpc.equipment.categories.query(),
    () => {
      const m = new Map<string, number>();
      fallback.equipment.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + 1));
      return Array.from(m, ([category, c]) => ({ category, c }));
    }
  );
}

export function getEquipmentList(category?: string) {
  return withFallback(
    () => trpc.equipment.list.query({ category }),
    () => (category ? fallback.equipment.filter((e) => e.category === category) : fallback.equipment)
  );
}

// ---------- 商家 ----------
export function getMerchants() {
  return withFallback(
    () => trpc.merchants.list.query(),
    () => fallback.merchants
  );
}
