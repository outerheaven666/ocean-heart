import { scryptSync, randomBytes } from "node:crypto";
import { db, dbReady, schema } from "./index.js";

function hash(password: string, salt: string) {
  return scryptSync(password, salt, 32).toString("hex");
}

export async function seedIfEmpty() {
  await dbReady;
  const hasSpecies = (await db.select().from(schema.species).limit(1).all()).length > 0;
  if (hasSpecies) return false;
  seed();
  return true;
}

export async function seed() {
  const now = Date.now();

  // ---------- 用户 ----------
  const saltA = randomBytes(8).toString("hex");
  const saltU = randomBytes(8).toString("hex");
  const adminId = Number((await db
    .insert(schema.users)
    .values({
      username: "admin",
      passwordHash: `${saltA}:${hash("admin123", saltA)}`,
      nickname: "海洋之心官方",
      realName: "平台管理员",
      role: "admin",
      createdAt: now,
    })
    .run()).lastInsertRowid);
  const userId = Number((await db
    .insert(schema.users)
    .values({
      username: "reefer",
      passwordHash: `${saltU}:${hash("reef1234", saltU)}`,
      nickname: "老猫爱海缸",
      realName: "张海洋",
      role: "user",
      createdAt: now,
    })
    .run()).lastInsertRowid);

  // ---------- 版块 ----------
  const boardDefs = [
    ["newbie", "新手下海", "开缸、选设备、入门答疑"],
    ["showcase", "晒缸展示", "晒出你的海缸,沉淀好作品"],
    ["disease", "鱼病问诊", "白点、烂身、立鳞…资深玩家坐诊"],
    ["id", "生物鉴定", "不认识的生物发图来问"],
    ["equipment", "设备讨论", "蛋分、灯具、造浪怎么选"],
    ["water", "水质交流", "水质参数、检测与调理"],
    ["local", "同城圈子", "找到身边的鱼友"],
    ["trade", "二手置换", "合规审查:保护物种禁发"],
    ["vendor", "商家区", "认证商家新品与活动"],
  ] as const;
  const boardIds: Record<string, number> = {};
  for (const [i, [slug, name, description]] of boardDefs.entries()) {
    boardIds[slug] = Number((await db
      .insert(schema.boards)
      .values({ slug, name, description, sort: i })
      .run()).lastInsertRowid);
  }

  // ---------- 生物资料库种子数据(自建编译,字段级溯源) ----------
  const SRC = "海洋之心资料库·基于公开文献与玩家社群资料自行整理编译";
  type S = typeof schema.species.$inferInsert;
  const fish: S[] = [
    { scientificName: "Amphiprion ocellaris", commonNameZh: "眼斑双锯鱼(公子小丑)", commonNameEn: "Ocellaris Clownfish", category: "fish", difficulty: "easy", temperament: "peaceful", maxSizeCm: 8, minTankL: 60, diet: "杂食,人工颗粒开口容易", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-西太平洋", description: "最适合新手入门的海水鱼,可与海葵共生。人工繁殖个体耐受力强,建议成对饲养。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", captiveBred: true, anemoneHost: "奶嘴海葵/公主海葵" }), dataSource: SRC },
    { scientificName: "Amphiprion percula", commonNameZh: "海葵双锯鱼(黑边公子)", commonNameEn: "Percula Clownfish", category: "fish", difficulty: "easy", temperament: "peaceful", maxSizeCm: 8, minTankL: 60, diet: "杂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "西太平洋", description: "与公子小丑近似,黑色边缘更宽,价格略高。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", captiveBred: true }), dataSource: SRC },
    { scientificName: "Paracanthurus hepatus", commonNameZh: "黄尾副刺尾鱼(蓝吊)", commonNameEn: "Blue Tang", category: "fish", difficulty: "moderate", temperament: "peaceful", maxSizeCm: 30, minTankL: 400, diet: "藻食为主,需紫菜/螺旋藻", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "《海底总动员》多莉。易感染白点,需要大水体的游泳空间,同类之间会打斗只养一条。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中上层", ichProne: true }), dataSource: SRC },
    { scientificName: "Zebrasoma flavescens", commonNameZh: "黄高鳍刺尾鱼(黄金吊)", commonNameEn: "Yellow Tang", category: "fish", difficulty: "moderate", temperament: "semi-aggressive", maxSizeCm: 20, minTankL: 300, diet: "藻食,需大量素食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "夏威夷群岛", description: "经典的黄色吊类,已有人工繁殖个体上市,优先选择人工苗。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", captiveBred: true }), dataSource: SRC },
    { scientificName: "Centropyge bispinosa", commonNameZh: "双棘刺尻鱼(珊瑚美人)", commonNameEn: "Coral Beauty Angelfish", category: "fish", difficulty: "moderate", temperament: "semi-aggressive", maxSizeCm: 10, minTankL: 150, diet: "杂食偏藻食", reefSafeCoral: 0, reefSafeInvert: 1, distribution: "印度-太平洋", description: "小型神仙,颜色艳丽,可能啄食 LPS 珊瑚与砗磲外套膜,礁岩缸需谨慎。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中下层" }), dataSource: SRC },
    { scientificName: "Mandarinfish", commonNameZh: "花斑连鳍䲗(麒麟鱼/青蛙)", commonNameEn: "Mandarinfish", category: "fish", difficulty: "expert", temperament: "peaceful", maxSizeCm: 6, minTankL: 100, diet: "活桡足类为主,极难开口人工饲料", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "西太平洋", description: "颜值天花板但开口难度极高,需要成熟礁岩缸持续供应活饵,新手勿碰。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "底层", feedingDifficulty: "expert" }), dataSource: SRC },
    { scientificName: "Gobiodon okinawae", commonNameZh: "冲绳叶虾虎(绿蟋蟀)", commonNameEn: "Okinawa Goby", category: "fish", difficulty: "easy", temperament: "peaceful", maxSizeCm: 5, minTankL: 40, diet: "小型浮游饵料", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "西太平洋", description: "亮绿色小型虾虎,栖息于鹿角珊瑚枝间,适合 nano 缸。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "底层" }), dataSource: SRC },
    { scientificName: "Salarias fasciatus", commonNameZh: "斑纹肩鳃鳚(西瓜刨)", commonNameEn: "Jewelled Blenny", category: "fish", difficulty: "easy", temperament: "peaceful", maxSizeCm: 12, minTankL: 100, diet: "藻食,刮食缸壁藻类", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "优秀的工具鱼,能控制缸内藻类,性格呆萌。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "底层", utility: "除藻" }), dataSource: SRC },
    { scientificName: "Nemateleotris magnifica", commonNameZh: "华丽线塘鳢(紫雷达)", commonNameEn: "Fire Goby", category: "fish", difficulty: "moderate", temperament: "peaceful", maxSizeCm: 8, minTankL: 60, diet: "浮游动物", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "胆小易跳缸,必须加盖。建议成对或小群饲养。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", jumpRisk: true }), dataSource: SRC },
    { scientificName: "Pseudanthias squamipinnis", commonNameZh: "鳞斑 pseudanthias(海金鱼)", commonNameEn: "Lyretail Anthias", category: "fish", difficulty: "hard", temperament: "peaceful", maxSizeCm: 12, minTankL: 300, diet: "浮游动物,需每日多次喂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-西太平洋", description: "群游性强,需要高频喂食,否则容易饿死。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中上层", feedingFrequency: "每日3-5次" }), dataSource: SRC },
    { scientificName: "Ostracion cubicus", commonNameZh: "粒突箱鲀(木瓜/盒子鱼)", commonNameEn: "Yellow Boxfish", category: "fish", difficulty: "hard", temperament: "peaceful", maxSizeCm: 45, minTankL: 500, diet: "杂食,需提供贝类磨牙", reefSafeCoral: 0, reefSafeInvert: 0, distribution: "印度-太平洋", description: "受威胁时会释放毒素可能团灭全缸,且成体巨大,不建议家庭缸饲养。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", toxinRisk: true }), dataSource: SRC },
    { scientificName: "Pterois volitans", commonNameZh: "翱翔蓑鲉(狮子鱼)", commonNameEn: "Red Lionfish", category: "fish", difficulty: "moderate", temperament: "aggressive", maxSizeCm: 38, minTankL: 400, diet: "肉食,活鱼虾开口后转冻饵", reefSafeCoral: 1, reefSafeInvert: 0, distribution: "印度-太平洋", description: "背棘有毒,操作时需小心。会吞食小型鱼虾,只能与大型鱼混养。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", venomous: true }), dataSource: SRC },
    { scientificName: "Labroides dimidiatus", commonNameZh: "裂唇鱼(医生鱼)", commonNameEn: "Cleaner Wrasse", category: "fish", difficulty: "expert", temperament: "peaceful", maxSizeCm: 10, minTankL: 200, diet: "专性啄食寄生虫,人工饲养极难", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "野生个体依赖清洁行为取食,缸内长期存活率低,不推荐购买。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", notRecommended: true }), dataSource: SRC },
    { scientificName: "Chelmon rostratus", commonNameZh: "钻嘴鱼(长嘴火箭)", commonNameEn: "Copperband Butterflyfish", category: "fish", difficulty: "hard", temperament: "peaceful", maxSizeCm: 20, minTankL: 300, diet: "管虫/贝类,开口困难", reefSafeCoral: 0, reefSafeInvert: 0, distribution: "西太平洋", description: "可控制垃圾葵,但开口难度高,会啄食珊瑚与管虫。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层" }), dataSource: SRC },
    { scientificName: "Synchiropus splendidus", commonNameZh: "五彩青蛙(绿麒麟)", commonNameEn: "Green Mandarin", category: "fish", difficulty: "expert", temperament: "peaceful", maxSizeCm: 6, minTankL: 100, diet: "活桡足类", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "西太平洋", description: "与麒麟鱼同属,同样需要成熟生态系统供养。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "底层", feedingDifficulty: "expert" }), dataSource: SRC },
    { scientificName: "Hippocampus kuda", commonNameZh: "库达海马", commonNameEn: "Common Seahorse", category: "fish", difficulty: "expert", temperament: "peaceful", maxSizeCm: 17, minTankL: 100, diet: "活丰年虾/糠虾", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "海马属所有种均为国家二级保护动物并入列 CITES 附录Ⅱ,禁止非法捕捞买卖。资料库仅作科普展示。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ swimmingLayer: "中层", complianceNote: "禁止交易" }), dataSource: SRC },
    { scientificName: "Gramma loreto", commonNameZh: "皇家丝鲈(紫背草莓)", commonNameEn: "Royal Gramma", category: "fish", difficulty: "easy", temperament: "peaceful", maxSizeCm: 8, minTankL: 80, diet: "肉食性,人工饲料开口良好", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "加勒比海", description: "紫黄撞色的小型鱼,性格温和适合新手礁岩缸。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中下层" }), dataSource: SRC },
    { scientificName: "Acanthurus leucosternon", commonNameZh: "白胸刺尾鱼(粉蓝吊)", commonNameEn: "Powder Blue Tang", category: "fish", difficulty: "hard", temperament: "aggressive", maxSizeCm: 23, minTankL: 500, diet: "藻食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度洋", description: "颜值极高但攻击性强、白点病高发,建议最后入缸。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", ichProne: true }), dataSource: SRC },
    { scientificName: "Chromis viridis", commonNameZh: "蓝绿光鳃雀鲷(青魔)", commonNameEn: "Blue Green Chromis", category: "fish", difficulty: "easy", temperament: "peaceful", maxSizeCm: 8, minTankL: 100, diet: "杂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "群游雀鲷,常作为闯缸鱼,价格便宜皮实。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "上层", schooling: true }), dataSource: SRC },
    { scientificName: "Amphiprion frenatus", commonNameZh: "白条双锯鱼(红小丑)", commonNameEn: "Tomato Clownfish", category: "fish", difficulty: "easy", temperament: "semi-aggressive", maxSizeCm: 14, minTankL: 100, diet: "杂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "西太平洋", description: "体型较大的小丑鱼,成体雌鱼有领地意识。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ swimmingLayer: "中层", captiveBred: true }), dataSource: SRC },
  ];
  const corals: S[] = [
    { scientificName: "Acropora millepora", commonNameZh: "千孔鹿角珊瑚(硬骨/SPS)", commonNameEn: "Acropora", category: "coral", difficulty: "expert", temperament: "", maxSizeCm: 50, minTankL: 200, diet: "光合共生+浮游生物", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "SPS 代表种,对水质波动极其敏感,需要强光照高水流与稳定的钙碱镁。注意:石珊瑚目所有种均为国家二级保护动物并入列 CITES 附录Ⅱ,买卖需特许资质,平台禁止相关交易信息。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ coralType: "SPS", lightPAR: "300-450", flow: "强", complianceNote: "石珊瑚目全目保护" }), dataSource: SRC },
    { scientificName: "Montipora capricornis", commonNameZh: "卷叶 monti(硬骨/SPS)", commonNameEn: "Montipora", category: "coral", difficulty: "hard", temperament: "", maxSizeCm: 40, minTankL: 150, diet: "光合共生", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "相对皮实的 SPS,适合作为进阶硬骨的第一块试炼。同属石珊瑚目,受法律保护。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ coralType: "SPS", lightPAR: "200-350", flow: "中强" }), dataSource: SRC },
    { scientificName: "Euphyllia ancora", commonNameZh: "锚头珊瑚(榔头/LPS)", commonNameEn: "Hammer Coral", category: "coral", difficulty: "moderate", temperament: "", maxSizeCm: 30, minTankL: 100, diet: "光合+虾肉喂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "飘逸的榔头珊瑚,触手有攻击性需留出间距。石珊瑚目,受法律保护,禁止违规交易。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ coralType: "LPS", lightPAR: "100-200", flow: "中", sweeperTentacles: true }), dataSource: SRC },
    { scientificName: "Euphyllia divisa", commonNameZh: "蛙卵珊瑚(气泡/LPS)", commonNameEn: "Frogspawn Coral", category: "coral", difficulty: "moderate", temperament: "", maxSizeCm: 30, minTankL: 100, diet: "光合+喂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "触手末端呈蛙卵状,与榔头同科可近距摆放。石珊瑚目保护物种。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ coralType: "LPS", lightPAR: "100-200", flow: "中" }), dataSource: SRC },
    { scientificName: "Caulastrea furcata", commonNameZh: "糖果脑珊瑚(LPS)", commonNameEn: "Candy Cane Coral", category: "coral", difficulty: "easy", temperament: "", maxSizeCm: 20, minTankL: 60, diet: "光合+少量喂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "入门级 LPS,颜色多样,耐受性好。石珊瑚目保护物种。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ coralType: "LPS", lightPAR: "80-150", flow: "中低" }), dataSource: SRC },
    { scientificName: "Favia favus", commonNameZh: "脑珊瑚(LPS)", commonNameEn: "Brain Coral", category: "coral", difficulty: "moderate", temperament: "", maxSizeCm: 30, minTankL: 100, diet: "光合+夜间喂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "经典的脑纹珊瑚,夜间伸展触手。石珊瑚目保护物种。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ coralType: "LPS", lightPAR: "100-200", flow: "中低" }), dataSource: SRC },
    { scientificName: "Catalaphyllia jardinei", commonNameZh: "优雅珊瑚(火柴头/LPS)", commonNameEn: "Elegance Coral", category: "coral", difficulty: "hard", temperament: "", maxSizeCm: 30, minTankL: 150, diet: "光合+肉食喂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "触手华丽但近年野生个体存活率低。石珊瑚目保护物种。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ coralType: "LPS", lightPAR: "100-200", flow: "中" }), dataSource: SRC },
    { scientificName: "Zoanthus spp.", commonNameZh: "纽扣珊瑚(软体)", commonNameEn: "Zoanthids", category: "coral", difficulty: "easy", temperament: "", maxSizeCm: 5, minTankL: 30, diet: "光合+浮游生物", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "全球热带海域", description: "色彩极其丰富的软体珊瑚,新手友好。注意部分品种含河豚毒素,操作时戴手套勿接触伤口。", protectionLevel: "无(软体珊瑚,非石珊瑚目)", tradeStatus: "tradable", detail: JSON.stringify({ coralType: "软体", lightPAR: "100-250", flow: "中", palytoxinRisk: true }), dataSource: SRC },
    { scientificName: "Sarcophyton spp.", commonNameZh: "皮革珊瑚(软体)", commonNameEn: "Toadstool Leather Coral", category: "coral", difficulty: "easy", temperament: "", maxSizeCm: 40, minTankL: 100, diet: "光合共生", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "蘑菇状软珊瑚,耐受性强,会定期蜕皮。", protectionLevel: "无(软体珊瑚)", tradeStatus: "tradable", detail: JSON.stringify({ coralType: "软体", lightPAR: "100-250", flow: "中" }), dataSource: SRC },
    { scientificName: "Sinularia spp.", commonNameZh: "手指皮革(软体)", commonNameEn: "Finger Leather Coral", category: "coral", difficulty: "easy", temperament: "", maxSizeCm: 30, minTankL: 80, diet: "光合共生", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "生长迅速的软珊瑚,会释放化感物质抑制周边珊瑚。", protectionLevel: "无(软体珊瑚)", tradeStatus: "tradable", detail: JSON.stringify({ coralType: "软体", lightPAR: "100-250", flow: "中", allelopathy: true }), dataSource: SRC },
    { scientificName: "Xenia spp.", commonNameZh: "闪千手(软体)", commonNameEn: "Pulsing Xenia", category: "coral", difficulty: "easy", temperament: "", maxSizeCm: 15, minTankL: 40, diet: "光合+吸收营养盐", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "会自主脉搏式开合,生长极快需控制扩散。", protectionLevel: "无(软体珊瑚)", tradeStatus: "tradable", detail: JSON.stringify({ coralType: "软体", lightPAR: "100-250", flow: "中", fastGrowing: true }), dataSource: SRC },
    { scientificName: "Tubastraea spp.", commonNameZh: "太阳花珊瑚(NPS)", commonNameEn: "Sun Coral", category: "coral", difficulty: "hard", temperament: "", maxSizeCm: 15, minTankL: 100, diet: "无光合,必须每日人工喂食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "非光合珊瑚,需要频繁喂食丰年虾/糠虾,适合有喂食耐心的玩家。石珊瑚目保护物种。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ coralType: "NPS", lightPAR: "无要求", flow: "中", feedingRequired: true }), dataSource: SRC },
  ];
  const inverts: S[] = [
    { scientificName: "Lysmata amboinensis", commonNameZh: "美人虾(清洁虾)", commonNameEn: "Cleaner Shrimp", category: "invert", difficulty: "easy", temperament: "peaceful", maxSizeCm: 6, minTankL: 60, diet: "残饵+鱼体寄生虫", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "会为鱼类清洁寄生虫,活泼好养。对铜药极度敏感,治疗白点下铜前必须移出。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ copperSensitive: true, utility: "清洁" }), dataSource: SRC },
    { scientificName: "Stenopus hispidus", commonNameZh: "假绵羊虾(美人虾/火焰虾)", commonNameEn: "Banded Coral Shrimp", category: "invert", difficulty: "easy", temperament: "semi-aggressive", maxSizeCm: 8, minTankL: 80, diet: "肉食,残饵碎屑", reefSafeCoral: 1, reefSafeInvert: 0, distribution: "全球热带", description: "红白相间颜值高,同类之间领地意识强建议单养,铜药敏感。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ copperSensitive: true }), dataSource: SRC },
    { scientificName: "Tridacna crocea", commonNameZh: "番红砗磲(五爪贝)", commonNameEn: "Crocea Clam", category: "invert", difficulty: "hard", temperament: "", maxSizeCm: 15, minTankL: 150, diet: "光合共生,需强光", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "砗磲科所有种均为国家二级保护动物并入列 CITES 附录Ⅱ,禁止非法买卖。资料库仅作科普展示。", protectionLevel: "国家二级 / CITES 附录Ⅱ", tradeStatus: "prohibited", detail: JSON.stringify({ complianceNote: "禁止交易", lightPAR: "300+" }), dataSource: SRC },
    { scientificName: "Trochus spp.", commonNameZh: "马蹄螺(宝塔螺)", commonNameEn: "Trochus Snail", category: "invert", difficulty: "easy", temperament: "peaceful", maxSizeCm: 5, minTankL: 30, diet: "藻食", reefSafeCoral: 1, reefSafeInvert: 1, distribution: "印度-太平洋", description: "优秀的除藻工具螺,翻倒后能自行翻正,可缸内繁殖。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ utility: "除藻", copperSensitive: true }), dataSource: SRC },
    { scientificName: "Calcinus elegans", commonNameZh: "蓝脚寄居蟹", commonNameEn: "Electric Blue Hermit Crab", category: "invert", difficulty: "easy", temperament: "semi-aggressive", maxSizeCm: 4, minTankL: 30, diet: "杂食,残饵藻类", reefSafeCoral: 1, reefSafeInvert: 0, distribution: "印度-太平洋", description: "会攻击螺类抢占壳,需要提供备用空壳。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ utility: "清洁残饵" }), dataSource: SRC },
    { scientificName: "Entacmaea quadricolor", commonNameZh: "奶嘴海葵(气泡海葵)", commonNameEn: "Bubble Tip Anemone", category: "invert", difficulty: "moderate", temperament: "", maxSizeCm: 30, minTankL: 100, diet: "光合+虾肉喂食", reefSafeCoral: 0, reefSafeInvert: 1, distribution: "印度-太平洋", description: "小丑鱼的经典宿主,会移动位置,成熟稳定缸再引入。", protectionLevel: "无", tradeStatus: "tradable", detail: JSON.stringify({ lightPAR: "200-300", hostFor: "双锯鱼属" }), dataSource: SRC },
  ];
  await db.insert(schema.species).values([...fish, ...corals, ...inverts]).run();

  // ---------- 水质参数 11 参数 x 4 缸型 ----------
  type W = typeof schema.waterParams.$inferInsert;
  const rows: W[] = [];
  const add = (param: string, unit: string, reef: [string, string, string], fowlr: [string, string, string], fot: [string, string, string], sps: [string, string, string], note = "") => {
    rows.push({ param, unit, tankType: "reef", minVal: reef[0], maxVal: reef[1], target: reef[2], note });
    rows.push({ param, unit, tankType: "fowlr", minVal: fowlr[0], maxVal: fowlr[1], target: fowlr[2], note });
    rows.push({ param, unit, tankType: "fot", minVal: fot[0], maxVal: fot[1], target: fot[2], note });
    rows.push({ param, unit, tankType: "sps", minVal: sps[0], maxVal: sps[1], target: sps[2], note });
  };
  add("温度", "°C", ["24", "27", "25-26"], ["22", "28", "24-26"], ["22", "28", "24-26"], ["25", "27", "26"], "避免单日波动超过 1°C");
  add("盐度", "比重", ["1.024", "1.026", "1.025"], ["1.020", "1.025", "1.023"], ["1.020", "1.025", "1.023"], ["1.025", "1.026", "1.025"], "珊瑚缸建议接近天然海水 1.025");
  add("pH", "", ["7.9", "8.4", "8.1-8.3"], ["7.8", "8.4", "8.0-8.2"], ["7.8", "8.4", "8.0-8.2"], ["8.0", "8.4", "8.2-8.4"], "夜间会自然下降");
  add("碱度 KH", "dKH", ["7", "11", "8-9"], ["6", "12", "8"], ["6", "12", "8"], ["7", "9", "7.5-8.5"], "SPS 缸 KH 稳定比数值更重要");
  add("钙", "ppm", ["380", "450", "400-420"], ["350", "450", "400"], ["350", "450", "400"], ["400", "450", "420-440"], "LPS/SPS 骨骼生长消耗");
  add("镁", "ppm", ["1250", "1400", "1300-1350"], ["1200", "1400", "1300"], ["1200", "1400", "1300"], ["1280", "1400", "1320-1380"], "镁不足会导致钙碱难以维持");
  add("硝酸盐 NO3", "ppm", ["0", "10", "2-5"], ["0", "30", "<20"], ["0", "30", "<20"], ["0", "5", "1-3"], "SPS 需要低营养盐但非绝对为零");
  add("磷酸盐 PO4", "ppm", ["0", "0.1", "0.03-0.08"], ["0", "0.5", "<0.3"], ["0", "0.5", "<0.3"], ["0", "0.05", "0.02-0.05"], "过高抑制珊瑚钙化、助长藻类");
  add("氨 NH3/NH4", "ppm", ["0", "0", "0"], ["0", "0", "0"], ["0", "0", "0"], ["0", "0", "0"], "任何可检出的氨都是危险信号");
  add("亚硝酸盐 NO2", "ppm", ["0", "0", "0"], ["0", "0", "0"], ["0", "0", "0"], ["0", "0", "0"], "开缸期指标,成熟缸应始终为零");
  add("溶氧", "mg/L", ["6", "9", "7-8"], ["5", "9", "6-8"], ["5", "9", "6-8"], ["6", "9", "7-8"], "夜间溶氧最低,注意通风与水面扰动");
  await db.insert(schema.waterParams).values(rows).run();

  // ---------- 设备资料库 ----------
  type E = typeof schema.equipment.$inferInsert;
  const eqs: E[] = [
    { category: "蛋分", brand: "八爪鱼(Reef Octopus)", model: "OCTO Classic 110-INT", keyParams: JSON.stringify({ 处理水量: "300-500L", 泵型: "直流针刷泵", 功耗: "12W" }), description: "入门级蛋分,性价比高,适合 300L 以内礁岩缸。" },
    { category: "蛋分", brand: "BM(Bubble Magus)", model: "Curve 5", keyParams: JSON.stringify({ 处理水量: "300-500L", 杯体: "锥形收集杯", 功耗: "8W" }), description: "国产主流蛋分,做工稳定,新手首选之一。" },
    { category: "蛋分", brand: "德国 NYOS", model: "Quantum 120", keyParams: JSON.stringify({ 处理水量: "400-900L", 泵型: "Hybrid 轮", 功耗: "22W" }), description: "高端蛋分,静音高效,适合中大型 SPS 缸。" },
    { category: "主泵", brand: "捷宝(Jebao/Jecod)", model: "DCP-6500", keyParams: JSON.stringify({ 流量: "6500L/h", 变频: "20档可调", 功耗: "50W" }), description: "直流变频上水泵,静音节能,国产高性价比。" },
    { category: "主泵", brand: "德国伊罕(EHEIM)", model: "CompactON 3000", keyParams: JSON.stringify({ 流量: "3000L/h", 功耗: "45W" }), description: "德系经典,皮实耐用。" },
    { category: "造浪", brand: "捷宝(Jebao)", model: "OW-25", keyParams: JSON.stringify({ 流量: "12000L/h", 模式: "恒流/脉冲/随机", 适用缸厚: "≤12mm" }), description: "入门造浪,模式丰富,手机 App 控制。" },
    { category: "造浪", brand: "美国 Ecotech", model: "Vortech MP40", keyParams: JSON.stringify({ 流量: "约19000L/h", 驱动: "无刷磁耦合", 模式: "礁岩随机/同步" }), description: "造浪天花板,缸内无电源线,珊瑚缸终极选择。" },
    { category: "灯具", brand: "积光(Zetlight)", model: "ZT-6800II", keyParams: JSON.stringify({ 功率: "160W", 通道: "5通道可编程", 适用: "60cm礁岩缸" }), description: "国产珊瑚灯代表,光谱针对 SPS 优化,App 编程日出日落。" },
    { category: "灯具", brand: "美国 Kessil", model: "A360X", keyParams: JSON.stringify({ 功率: "90W", 光源: "Dense Matrix LED", 光谱: "Tuna Blue" }), description: "点光源 shimmer 效果最接近自然海,颜值高。" },
    { category: "灯具", brand: "AI(AquaIllumination)", model: "Hydra 32HD", keyParams: JSON.stringify({ 功率: "90W", 通道: "7通道", 控制: "myAI App" }), description: "高端全光谱珊瑚灯,显色与生长兼顾。" },
    { category: "RO机", brand: "溢泰(Kemflo)", model: "75G 四级 RO", keyParams: JSON.stringify({ 产水量: "75加仑/天", 级数: "PP+CTO+RO+DI", TDS: "出水<5ppm" }), description: "海缸必备,DI 单元保障 0 TDS 纯水,杜绝营养盐输入。" },
    { category: "RO机", brand: "美国 SpectraPure", model: "MaxCap 90", keyParams: JSON.stringify({ 产水量: "90加仑/天", 特点: "高脱盐率膜", TDS: "0-1ppm" }), description: "高端 RO/DI,出水稳定,耗材寿命长。" },
    { category: "钙反", brand: "德国 Grotech", model: "TEC 2", keyParams: JSON.stringify({ 适用缸体: "500-1000L", CO2消耗: "可调", 介质: "珊瑚骨" }), description: "SPS 大缸维持钙碱的经典方案。" },
    { category: "滴定", brand: "捷宝(Jebao)", model: "DP-4S", keyParams: JSON.stringify({ 通道: "4通道", 精度: "±0.05ml", 控制: "WiFi App" }), description: "入门滴定泵,滴定 KH/Ca/Mg 三要素性价比之选。" },
    { category: "滴定", brand: "美国 Neptune", model: "DOS", keyParams: JSON.stringify({ 通道: "2通道可扩展", 联动: "Apex 生态", 精度: "0.1ml" }), description: "配合 Apex 实现全自动水质管理。" },
    { category: "检疫缸", brand: "通用配置", model: "40-60L 简易检疫缸", keyParams: JSON.stringify({ 建议容积: "40-60L", 配置: "加热棒+气石+躲避管", 周期: "新鱼4-6周" }), description: "新鱼入缸前隔离检疫,是降低鱼病损耗最重要的一步。" },
  ];
  await db.insert(schema.equipment).values(eqs).run();

  // ---------- 商家(一个已通过认证的示例商家) ----------
  await db.insert(schema.merchants).values({
    userId: adminId,
    name: "蓝海之光水族器材",
    categories: "珊瑚灯具 / 蛋分 / 耗材",
    licenseNo: "91310000MA1FL0000X",
    wildPermitNo: null,
    address: "上海市浦东新区(示例)",
    intro: "专注海水器材十年,提供灯具光谱调试与售后校准服务。前 20 家免费认证商家之一。",
    status: "approved",
    createdAt: now,
  }).run();

  // ---------- 精华帖种子内容 ----------
  const post1 = Number((await db.insert(schema.posts).values({
    boardId: boardIds.newbie, userId: adminId, isEssence: 1,
    title: "【精华】新手开缸全流程:从空缸到闯缸鱼的 45 天",
    content: "第一天:缸体定位、底柜调平、粘缸检查。\n第 1-7 天:RO 水化盐(盐度 1.025),活石/造景石入缸,开灯每天 4 小时。\n第 7-21 天:氨氮循环期,每日测氨/亚硝酸盐,出现褐藻属正常。\n第 21-35 天:亚硝酸盐归零后下第一批工具生物(马蹄螺、清洁虾)。\n第 35-45 天:水质稳定(KH 8-9、NO3<10)后下闯缸鱼(青魔/公子小丑),每周换水 10%。\n常见翻车点:心急下鱼、自来水直接化盐、蛋分过早开。",
    createdAt: now - 86400000 * 6,
  }).run()).lastInsertRowid);
  await db.insert(schema.posts).values({
    boardId: boardIds.water, userId: adminId, isEssence: 1,
    title: "【精华】水质入门:11 个参数里真正要每天盯的只有 3 个",
    content: "每天盯:温度、盐度(蒸发补水)、KH。\n每周测:NO3、PO4、钙、镁。\n每月或出问题再测:pH、氨、亚硝酸盐、溶氧。\n为什么 KH 优先:KH 是海缸的『缓冲垫』,KH 稳则 pH 稳、珊瑚钙化稳。SPS 缸 KH 日波动应 <0.5dKH。\n换水是最万能的调理手段:10-20% 每周,胜过一切药瓶。",
    createdAt: now - 86400000 * 5,
  }).run();
  await db.insert(schema.posts).values({
    boardId: boardIds.disease, userId: adminId, isEssence: 1,
    title: "【精华】常见病图鉴:白点、飞碟虫、烂身病的鉴别与处置",
    content: "白点病(刺激隐核虫):体表细小白点,鱼蹭缸、呼吸急促。处置:检疫缸铜药治疗 14 天,主缸空缸 6 周断生命周期。注意:下铜前必须移出所有无脊椎动物。\n飞碟虫(卵圆鞭毛虫):金褐色粉末状斑点,比白点更致命,发展极快,需立即铜药+甲醛浴。\n烂身病(细菌性):鳍条溃烂、体表充血,多为水质恶化继发,先换水再用抗生素药浴。\n铁律:新鱼必须检疫 4-6 周,这是把鱼病挡在主缸外的唯一办法。",
    createdAt: now - 86400000 * 4,
  }).run();
  await db.insert(schema.posts).values({
    boardId: boardIds.newbie, userId: adminId, isEssence: 1,
    title: "【合规必读】这些生物买卖可能违法:石珊瑚、砗磲、海马",
    content: "石珊瑚目所有种(鹿角珊瑚、脑珊瑚、榔头等 LPS/SPS)= 国家二级保护动物 + CITES 附录Ⅱ,无论活体死体甚至碎枝滤材都在管制范围。\n砗磲科所有种、海龟、海马同属保护名录。\n平台规则:二手置换版块发布上述物种信息将被直接删除并记录;认证活体商家必须上传《水生野生动物经营利用许可证》。\n已有玩家因购买保护物种被追诉的真实案例,请务必重视。",
    createdAt: now - 86400000 * 3,
  }).run();
  await db.insert(schema.posts).values({
    boardId: boardIds.showcase, userId, isEssence: 0,
    title: "晒缸:90cm 混养缸满月记录",
    content: "开缸第 30 天,KH 稳定在 8.5,NO3 约 5ppm。目前生物:公子小丑一对、青魔×5、美人虾×2、马蹄螺×8。纽扣已经开始发色,晒张全家福(图后补)。欢迎指正!",
    createdAt: now - 86400000 * 2,
  }).run();
  await db.insert(schema.posts).values({
    boardId: boardIds.disease, userId, isEssence: 0,
    title: "求助:蓝吊身上出现白点,呼吸有点急",
    content: "缸龄 4 个月,90 缸。三天前进的蓝吊,今早发现胸鳍有十几个白点,蹭活石。其他鱼正常。盐度 1.024,温度 26,KH 8。需要先捞出来进检疫缸吗?缸里有清洁虾和螺,能下铜药吗?",
    createdAt: now - 86400000 * 1,
  }).run();

  await db.insert(schema.comments).values([
    { postId: post1, userId, content: "感谢整理!按这个节奏开的缸,第 40 天水质全绿,前来还愿。", createdAt: now - 86400000 * 2 },
    { postId: post1, userId: adminId, content: "补充:夏天开缸注意冷水机,温度波动是新手第一杀手。", createdAt: now - 86400000 * 2 },
  ]).run();

  console.log("Seed data inserted.");
}

// 直接运行时强制重建种子(仅当库为空;需重置请删除 data/ocean-heart.db)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed.ts")) {
  if (await seedIfEmpty()) console.log("Database seeded (was empty).");
  else console.log("Database already has data; skip. Delete server/data/ocean-heart.db to reseed.");
}
