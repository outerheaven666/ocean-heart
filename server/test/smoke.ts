import assert from "node:assert";
import { appRouter, createContext } from "../src/trpc/router.js";
import { seedIfEmpty } from "../src/db/seed.js";

await seedIfEmpty();

let passed = 0;
function ok(name: string) {
  passed++;
  console.log(`  ✓ ${name}`);
}

const anon = appRouter.createCaller(await createContext({}));

// 1. 基础数据
const boards = await anon.boards.list();
assert.equal(boards.length, 9, "应有 9 个版块");
ok(`版块列表 (${boards.length} 个)`);

const fish = await anon.species.list({ category: "fish" });
const corals = await anon.species.list({ category: "coral" });
const inverts = await anon.species.list({ category: "invert" });
assert.ok(fish.length >= 20 && corals.length >= 12 && inverts.length >= 6);
ok(`资料库物种 鱼${fish.length}/珊瑚${corals.length}/无脊椎${inverts.length}`);

const water = await anon.waterParams.list({});
assert.equal(water.length, 44, "水质参数应为 11x4=44 条");
ok(`水质参数 ${water.length} 条 (11参数×4缸型)`);

const eqCats = await anon.equipment.categories();
assert.equal(eqCats.length, 8, "设备应为 8 大品类");
ok(`设备品类 (${eqCats.map((c) => c.category).join("/")})`);

const merchants = await anon.merchants.list();
assert.ok(merchants.length >= 1 && merchants[0].status === "approved");
ok(`认证商家展示 (${merchants.length} 家)`);

// 2. 合规:保护物种标注
const prohibited = await anon.species.list({ tradeStatus: "prohibited" });
assert.ok(prohibited.length >= 8, "应有一批禁止交易物种(石珊瑚/砗磲/海马)");
ok(`保护物种合规标注 (${prohibited.length} 个物种标记禁止交易)`);

// 3. 注册/登录/实名制
const reg = await anon.auth.register({ username: "smoketest", password: "test123456", nickname: "冒烟测试员" });
assert.ok(reg.token);
ok("注册新用户");
let authed = appRouter.createCaller(await createContext({ authorization: `Bearer ${reg.token}` }));

let realNameBlocked = false;
try {
  await authed.posts.create({ boardSlug: "newbie", title: "未实名测试帖", content: "这条应该被拦截" });
} catch (e: any) {
  realNameBlocked = e.code === "FORBIDDEN";
}
assert.ok(realNameBlocked, "未实名发帖应被拦截");
ok("未实名禁止发帖(实名制拦截)");

await authed.auth.setRealName({ realName: "测试实名" });
// 实名后重新建立会话上下文(等价于下一次 HTTP 请求重新加载用户)
authed = appRouter.createCaller(await createContext({ authorization: `Bearer ${reg.token}` }));
ok("个人中心实名登记");

// 4. 合规:二手区敏感词先审后发
let tradeBlocked = false;
try {
  await authed.posts.create({ boardSlug: "trade", title: "出一块鹿角珊瑚断枝", content: "自家缸剪下来的,便宜出" });
} catch (e: any) {
  tradeBlocked = e.code === "FORBIDDEN";
}
assert.ok(tradeBlocked, "二手区发布保护物种应被拦截");
ok("二手置换版块保护物种禁发规则");

// 5. 正常发帖/评论/点赞/收藏
const { id: postId } = await authed.posts.create({ boardSlug: "newbie", title: "新人报道,准备开 60 缸", content: "预算 1500,求一份设备清单,谢谢各位大佬!" });
assert.ok(postId > 0);
ok("实名后正常发帖");

const { id: commentId } = await authed.comments.create({ postId, content: "沙发!预算内建议:BM 蛋分 + 捷宝主泵 + 积光灯。" });
assert.ok(commentId > 0);
ok("回帖");

const like = await authed.posts.toggleLike({ postId });
assert.equal(like.liked, true);
const fav = await authed.posts.toggleFavorite({ postId });
assert.equal(fav.favorited, true);
ok("点赞 + 收藏");

const detail = await authed.posts.byId({ id: postId });
assert.equal(detail.likeCount, 1);
assert.equal(detail.favorited, true);
ok(`帖子详情(浏览数 ${detail.views}, 点赞 ${detail.likeCount})`);

const mine = await authed.posts.mine();
assert.ok(mine.some((p) => p.id === postId));
const myFavs = await authed.posts.myFavorites();
assert.ok(myFavs.some((p) => p.id === postId));
ok("个人中心:我的帖子/我的收藏");

// 6. 搜索与筛选
const search = await anon.posts.list({ q: "开缸" });
assert.ok(search.total >= 1);
ok(`帖子搜索("开缸" 命中 ${search.total} 条)`);

const smallTank = await anon.species.list({ category: "fish", minTankMax: 60 });
assert.ok(smallTank.length >= 2 && smallTank.every((s) => (s.minTankL ?? 0) <= 60));
ok(`资料库筛选(60L 缸可养鱼类 ${smallTank.length} 种)`);

// 7. 商家入驻申请
const apply = await authed.merchants.submitApplication({ name: "测试水族商店", categories: "设备/耗材", licenseNo: "91110000TEST00001", intro: "测试申请" });
assert.equal(apply.status, "pending");
const myApp = await authed.merchants.myApplication();
assert.equal(myApp?.status, "pending");
ok("商家入驻申请(待审核状态)");

// 8. 种子账号登录
const login = await anon.auth.login({ username: "admin", password: "admin123" });
assert.ok(login.token && login.user.role === "admin");
ok("管理员账号登录");

console.log(`\nSMOKE TEST PASSED: ${passed} 项全部通过`);
