# -*- coding: utf-8 -*-
"""扩充线上 Turso 资料库:新增物种与设备条目(直连 Turso /v2/pipeline)。
凭据从环境变量读取: TURSO_DATABASE_URL / TURSO_AUTH_TOKEN
幂等:已存在的 scientific_name / brand+model 自动跳过。
用法: set TURSO_DATABASE_URL=... && set TURSO_AUTH_TOKEN=... && python scripts/enrich_db.py
"""
import io
import json
import os
import sys
import urllib.request

URL = os.environ["TURSO_DATABASE_URL"].replace("libsql://", "https://") + "/v2/pipeline"
TOKEN = os.environ["TURSO_AUTH_TOKEN"]
SRC = "海洋之心资料库·基于公开文献与玩家社群资料自行整理编译"


def arg(v):
    if v is None:
        return {"type": "null"}
    if isinstance(v, int):
        return {"type": "integer", "value": str(v)}
    return {"type": "text", "value": str(v)}


def pipeline(stmts):
    """stmts: [(sql, args), ...] 一次 pipeline 执行"""
    reqs = [{"type": "execute", "stmt": {"sql": sql, "args": [arg(a) for a in args]}} for sql, args in stmts]
    reqs.append({"type": "close"})
    req = urllib.request.Request(URL, data=json.dumps({"requests": reqs}).encode(), method="POST")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read().decode())
    for r in body["results"]:
        if r["type"] == "error":
            raise RuntimeError(r["error"]["message"])
    return body["results"]


def existing(col, table):
    rs = pipeline([(f"SELECT {col} FROM {table}", [])])[0]
    return {row[0]["value"] for row in rs["response"]["result"]["rows"]}


# ---------- 新物种: (学名, 中文名, 英文名, 类别, 难度, 性情, 成体cm, 最小缸L, 食性, 珊瑚安全, 无脊椎安全, 分布, 描述, 保护级别, 可交易性, detail) ----------
FISH = [
    ("Centropyge loricula", "火焰仙", "Flame Angelfish", "fish", "moderate", "semi-aggressive", 10, 150,
     "杂食偏藻食,需含螺旋藻饵料", 0, 1, "太平洋中西部",
     "最热门的小型神仙,火焰般的橘红色。可能啄食 LPS 与砗磲外套膜,礁岩缸观察入缸。同类只能养一条。", "无", "tradable",
     {"swimmingLayer": "中下层", "captiveBred": False}),
    ("Pygoplites diacanthus", "毛巾仙(皇帝仙)", "Regal Angelfish", "fish", "expert", "semi-aggressive", 25, 400,
     "海绵/海鞘为主,开口人工饲料困难", 0, 1, "印度-太平洋",
     "颜值天花板之一,但野生个体开口难、运输损耗大。只建议购买已开口颗粒的定养个体,新手绕行。", "无", "tradable",
     {"swimmingLayer": "中层", "feedingDifficulty": "hard"}),
    ("Siganus vulpinus", "狐狸鱼(狐面篮子鱼)", "Foxface Rabbitfish", "fish", "moderate", "peaceful", 24, 300,
     "藻食为主,可控制缸内丝藻", 1, 1, "西太平洋",
     "优秀的除藻工具鱼,性格温和。注意背棘有毒,捞取时用容器引导别用手按。受惊会装死侧躺,别误以为挂了。", "无", "tradable",
     {"swimmingLayer": "中层", "venomous": True, "utility": "除藻"}),
    ("Valenciennea strigata", "金头虾虎(钻石哨兵)", "Diamond Watchman Goby", "fish", "moderate", "peaceful", 15, 150,
     "滤食砂中微小生物,需未覆膜的活砂", 1, 1, "印度-太平洋",
     "勤劳的翻砂工,能保持砂床洁白。需要厚砂床(5cm+)和充足砂中生物,瘦缸容易饿死,喂食要沉底。", "无", "tradable",
     {"swimmingLayer": "底层", "utility": "翻砂", "sandBedRequired": True}),
    ("Cryptocentrus cinctus", "黄蟋蟀虾虎(黄金哨兵)", "Yellow Watchman Goby", "fish", "easy", "peaceful", 8, 60,
     "肉食性,沉底颗粒/冻丰年虾", 1, 1, "西太平洋",
     "与枪虾共生的经典组合:虾虎放哨、枪虾挖洞,观察它们互动是海缸一大乐趣。会跳缸,务必加盖。", "无", "tradable",
     {"swimmingLayer": "底层", "symbiosis": "枪虾", "jumpRisk": True}),
    ("Elacatinus oceanops", "霓虹虾虎(蓝灯虾虎)", "Neon Goby", "fish", "easy", "peaceful", 5, 40,
     "肉食性,啄食鱼体寄生虫", 1, 1, "加勒比海",
     "体型小巧的电光蓝虾虎,会给大鱼做清洁。适合 nano 缸,人工繁殖个体常见且皮实。", "无", "tradable",
     {"swimmingLayer": "底层", "utility": "清洁", "captiveBred": True}),
    ("Amphiprion clarkii", "克氏双锯鱼(黑红小丑)", "Clark's Clownfish", "fish", "easy", "semi-aggressive", 15, 100,
     "杂食,人工饲料开口极佳", 1, 1, "印度-太平洋",
     "适应性最强的小丑鱼,几乎接受所有海葵。成体较大且有领地意识,小缸建议单养一对。", "无", "tradable",
     {"swimmingLayer": "中层", "captiveBred": True, "anemoneHost": "多种海葵"}),
    ("Premnas biaculeatus", "透红小丑", "Maroon Clownfish", "fish", "moderate", "aggressive", 17, 150,
     "杂食", 1, 1, "印度-西太平洋",
     "颜色浓郁的大型小丑,但脾气在小丑里最暴,配对期雌鱼攻击性很强。与奶嘴海葵是绝配,别和公子小丑混养。", "无", "tradable",
     {"swimmingLayer": "中层", "captiveBred": True, "anemoneHost": "奶嘴海葵"}),
    ("Halichoeres chrysus", "黄龙(金飘飘)", "Yellow Coris Wrasse", "fish", "easy", "peaceful", 12, 150,
     "肉食,吃扁虫/刚毛虫等小型有害生物", 1, 0,  "印度-太平洋",
     "金黄色的隆头鱼,会吃缸里的扁虫和锥螺,是天然的生物防治员。受惊或睡觉会钻砂,需要 3cm 以上细砂层。", "无", "tradable",
     {"swimmingLayer": "中层", "utility": "吃扁虫", "sandBedRequired": True}),
    ("Ecsenius bicolor", "二色鳚(金尾西瓜刨)", "Bicolor Blenny", "fish", "easy", "peaceful", 10, 100,
     "藻食,刮食藻类兼食颗粒", 1, 1, "印度-太平洋",
     "前蓝后橙的呆萌鳚鱼,喜欢占个小洞探头探脑。除藻能力不错,偶尔啄食 SPS 基座需观察。", "无", "tradable",
     {"swimmingLayer": "底层", "utility": "除藻"}),
    ("Acanthurus achilles", "鸡心吊", "Achilles Tang", "fish", "expert", "aggressive", 25, 600,
     "藻食,需大量紫菜", 1, 1, "中太平洋",
     "黑底橙心的梦幻吊类,但对水流、溶氧、水质要求极高,白点病头号易感选手,运输应激死亡率高。只推荐大缸高手的收官之鱼。", "无", "tradable",
     {"swimmingLayer": "中上层", "ichProne": True}),
    ("Naso lituratus", "天狗吊(颊纹鼻鱼)", "Naso Tang", "fish", "hard", "semi-aggressive", 46, 700,
     "藻食,需大量素食", 1, 1, "印度-太平洋",
     "吻部突出的标志性大型吊,成体接近半米,需要巨大水体。饲养前请认真评估缸体,这不是 60 缸能考虑的鱼。", "无", "tradable",
     {"swimmingLayer": "中上层"}),
    ("Pterapogon kauderni", "泗水玫瑰(巴厘天使)", "Banggai Cardinalfish", "fish", "easy", "peaceful", 8, 80,
     "肉食性,冻丰年虾/颗粒", 1, 1, "印尼班盖群岛(人工繁殖为主)",
     "黑白条纹的高颜值天竺鲷,口孵繁殖有趣。野生种群曾因过度捕捞告急,请务必购买人工繁殖(CB)个体,便宜又皮实。", "无(请选人工繁殖个体)", "tradable",
     {"swimmingLayer": "中层", "captiveBred": True}),
    ("Sphaeramia nematoptera", "睡衣天竺鲷", "Pajama Cardinalfish", "fish", "easy", "peaceful", 9, 100,
     "肉食性,人工饲料开口好", 1, 1, "西太平洋",
     "像穿着睡衣的可爱天竺鲷,夜行性,白天喜欢结群悬停在角落。适合小群饲养,对 LPS 缸友好。", "无", "tradable",
     {"swimmingLayer": "中层", "schooling": True}),
    ("Calloplesiops altivelis", "彗星(珍珠狐)", "Marine Betta", "fish", "moderate", "peaceful", 20, 300,
     "肉食,冻虾/小鱼,开口需耐心", 1, 0, "印度-太平洋",
     "满身星点的夜行美人,受惊会把头钻进洞里露出带眼斑的尾巴装海鳝。会吞食小虾,与美人虾混养需谨慎。", "无", "tradable",
     {"swimmingLayer": "中下层", "nocturnal": True}),
    ("Dascyllus trimaculatus", "三点白(三间雀)", "Three-spot Dascyllus", "fish", "easy", "aggressive", 14, 100,
     "杂食,几乎什么都吃", 1, 1, "印度-太平洋",
     "传统闯缸鱼,皮实到怎么养都不死——但成体脾气暴躁会追着温和鱼打。建议只作开缸过渡,稳定后请为它另找归宿。", "无", "tradable",
     {"swimmingLayer": "中层", "cyclingFish": True}),
    ("Chrysiptera parasema", "黄尾蓝魔", "Yellowtail Damselfish", "fish", "easy", "semi-aggressive", 7, 80,
     "杂食", 1, 1, "西太平洋",
     "蓝身黄尾的小型雀鲷,价格便宜颜色亮眼,比三点白温和一些,但仍需注意缸内弱势鱼的处境。", "无", "tradable",
     {"swimmingLayer": "中层"}),
    ("Pseudochromis fridmani", "紫罗兰草莓", "Orchid Dottyback", "fish", "easy", "semi-aggressive", 8, 80,
     "肉食,人工饲料开口好", 1, 1, "红海(现多人工繁殖)",
     "通体紫罗兰色的草莓鱼,市面上基本都是人工繁殖个体,皮实好养。有领地意识,提供足够洞穴即可。", "无", "tradable",
     {"swimmingLayer": "中下层", "captiveBred": True}),
    ("Oxymonacanthus longirostris", "橘点狐狸鱼(长吻单棘鲀)", "Orange-spotted Filefish", "fish", "expert", "peaceful", 12, 150,
     "专食 SPS 珊瑚水螅体,极难转换饵料", 0, 1, "印度-太平洋",
     "网图很美,但它是珊瑚食性的专家级鱼种,进 reef 缸等于请了个拆迁队。除非你明确要养 FOT 并能解决开口,否则别碰。", "无", "tradable",
     {"swimmingLayer": "中层", "coralEater": True, "notRecommended": True}),
    ("Antennarius maculatus", "五脚虎(大斑躄鱼)", "Warty Frogfish", "fish", "hard", "aggressive", 15, 150,
     "肉食,会吞掉比自己小一半的任何生物", 1, 0, "印度-太平洋",
     "用'钓竿'诱捕猎物的伪装大师,缸里所有小鱼小虾都是它的猎物。只能单养或物种缸,喂食切忌用手。", "无", "tradable",
     {"swimmingLayer": "底层", "ambush": True}),
]

CORALS = [
    ("Rhodactis spp.", "菇珊瑚(蓝菇/红菇/绿菇)", "Mushroom Coral", "coral", "easy", "", 10, 30,
     "光合+吸收营养盐,可喂虾肉", 1, 1, "印度-太平洋",
     "新手最友好的珊瑚之一,弱光弱流也能活,颜色丰富还会自行分裂增殖。会缓慢移动位置,注意别让它爬上其他珊瑚。", "无(软体珊瑚)", "tradable",
     {"coralType": "软体", "lightPAR": "50-150", "flow": "低"}),
    ("Discosoma spp.", "圆盘菇(蓝纹菇)", "Disc Mushroom", "coral", "easy", "", 8, 30,
     "光合共生", 1, 1, "印度-太平洋",
     "表面有蓝纹或条纹的扁平菇类,繁殖快,适合铺满造景石低光区。与菇珊瑚习性相近,极易饲养。", "无(软体珊瑚)", "tradable",
     {"coralType": "软体", "lightPAR": "50-150", "flow": "低"}),
    ("Ricordea florida", "佛罗里达菇(彩菇)", "Florida Ricordea", "coral", "moderate", "", 8, 60,
     "光合+浮游生物", 1, 1, "加勒比海",
     "菇类里的颜值担当,橙绿撞色的泡泡触手。比蓝菇娇气一些,中低光中流,喂碎虾肉长得更快。", "无(软体珊瑚)", "tradable",
     {"coralType": "软体", "lightPAR": "80-180", "flow": "中低"}),
    ("Pachyclavularia violacea", "星花珊瑚(满天星)", "Star Polyps", "coral", "easy", "", 20, 40,
     "光合共生", 1, 1, "印度-太平洋",
     "紫色垫子上开满小星花,生长迅速,适合铺在独立石头上做成'花岛'。长势太旺需要定期修剪控制。", "无(软体珊瑚)", "tradable",
     {"coralType": "软体", "lightPAR": "100-250", "flow": "中", "fastGrowing": True}),
    ("Clavularia viridis", "绿千手佛", "Green Star Polyps / Clove Polyps", "coral", "easy", "", 15, 40,
     "光合共生", 1, 1, "印度-太平洋",
     "荧光绿的细长触手随水流摇摆,群开时非常梦幻。皮实耐养,同样需要隔离种植防止蔓延全缸。", "无(软体珊瑚)", "tradable",
     {"coralType": "软体", "lightPAR": "100-250", "flow": "中"}),
    ("Lobophyllia hemprichii", "富士脑珊瑚(LPS)", "Lobo Brain Coral", "coral", "moderate", "", 25, 100,
     "光合+夜间肉食喂食", 1, 1, "印度-太平洋",
     "纹理饱满的脑类 LPS,颜色从荧光绿到血红都有。夜间喂食虾肉会明显加速生长。石珊瑚目保护物种,禁止违规交易。", "国家二级 / CITES 附录Ⅱ", "prohibited",
     {"coralType": "LPS", "lightPAR": "80-150", "flow": "低", "feedingResponse": True}),
    ("Duncanopsammia axifuga", "单胞珊瑚(邓肯/LPS)", "Duncan Coral", "coral", "moderate", "", 30, 100,
     "光合+积极摄食虾肉", 1, 1, "澳大利亚-东南亚",
     "触手像迷你海葵的群生 LPS,给食就长,新手也能养出成就感。石珊瑚目保护物种,禁止违规交易。", "国家二级 / CITES 附录Ⅱ", "prohibited",
     {"coralType": "LPS", "lightPAR": "80-180", "flow": "中低"}),
    ("Goniopora spp.", "宝石花(圆帽/LPS)", "Flowerpot Coral", "coral", "hard", "", 25, 150,
     "光合+浮游生物,需频繁补充", 1, 1, "印度-太平洋",
     "开花时美不胜收,但长期饲养存活率历来偏低,对水质和营养盐都有要求。石珊瑚目保护物种,禁止违规交易。", "国家二级 / CITES 附录Ⅱ", "prohibited",
     {"coralType": "LPS", "lightPAR": "100-200", "flow": "中", "survivalNote": "长期饲养难度高"}),
    ("Blastomussa wellsi", "炮仗花珊瑚(LPS)", "Blastomussa", "coral", "moderate", "", 15, 80,
     "光合+小型浮游饵料", 1, 1, "印度-太平洋",
     "一簇簇像炮仗的红色小喇叭,低光区造景点缀神器。畏强光,放暗处反而开得好。石珊瑚目保护物种。", "国家二级 / CITES 附录Ⅱ", "prohibited",
     {"coralType": "LPS", "lightPAR": "50-120", "flow": "低"}),
    ("Heliofungia actiniformis", "长须飞盘珊瑚(LPS)", "Plate Coral", "coral", "moderate", "", 25, 100,
     "光合+肉食喂食", 1, 1, "印度-太平洋",
     "看起来像大海葵的单独体珊瑚,小丑鱼甚至会把它当家。放砂面上饲养,底部易感染需注意。石珊瑚目保护物种。", "国家二级 / CITES 附录Ⅱ", "prohibited",
     {"coralType": "LPS", "lightPAR": "100-200", "flow": "中低", "anemoneLike": True}),
]

INVERTS = [
    ("Alpheus randalli", "老虎枪虾(共生枪虾)", "Randall's Pistol Shrimp", "invert", "easy", "peaceful", 5, 40,
     "肉食,残饵/冻饵", 1, 1, "印度-太平洋",
     "与黄蟋蟀虾虎共生的经典搭档:枪虾视力差负责挖洞,虾虎负责放哨。 snapping 声是正常现象,不是缸裂了。", "无", "tradable",
     {"symbiosis": "虾虎鱼", "utility": "造景共生"}),
    ("Thor amboinensis", "性感虾", "Sexy Shrimp", "invert", "easy", "peaceful", 2, 20,
     "浮游生物/碎屑", 1, 1, "印度-太平洋",
     "指甲盖大小的迷你虾,翘着尾巴摇摆的姿态极度治愈。适合 nano 缸和奶嘴海葵共生,注意别被造浪吸进去。", "无", "tradable",
     {"copperSensitive": True, "nanoTank": True}),
    ("Periclimenes brevicarpalis", "海葵虾(白斑拖虾)", "Anemone Shrimp", "invert", "easy", "peaceful", 4, 40,
     "肉食,与海葵共生", 1, 1, "印度-太平洋",
     "透明身体带白斑,栖息在海葵触手间。买奶嘴海葵时可以顺一只,观察共生关系很有趣。铜药敏感。", "无", "tradable",
     {"copperSensitive": True, "symbiosis": "海葵"}),
    ("Sabellastarte spectabilis", "印度羽毛管虫", "Feather Duster Worm", "invert", "easy", "peaceful", 12, 60,
     "滤食水中浮游生物", 1, 1, "印度-太平洋",
     "展开像一把羽毛扇的滤食性管虫,受惊会瞬间缩回管中。水质波动时会脱冠,别急着扔,多半能重新长出来。", "无", "tradable",
     {"copperSensitive": True, "filterFeeder": True}),
    ("Nassarius sp.", "织纹螺(牛鼻螺)", "Nassarius Snail", "invert", "easy", "peaceful", 3, 30,
     "肉食,清理砂中残饵", 1, 1, "印度-太平洋",
     "平时埋在砂里只露一根'鼻管',一喂食就集体钻出来,是清理残饵和翻砂的好帮手。需要砂床。", "无", "tradable",
     {"utility": "清残饵翻砂", "sandBedRequired": True, "copperSensitive": True}),
    ("Nerita sp.", "蜜蜂角螺(斑马螺)", "Nerite Snail", "invert", "easy", "peaceful", 3, 30,
     "藻食,啃食缸壁藻类", 1, 1, "印度-太平洋",
     "缸壁玻璃的清洁主力,斑马纹或角状突起。偶尔会爬到水线以上,注意缸边防逃。在海水里不繁殖,不会爆缸。", "无", "tradable",
     {"utility": "除藻", "copperSensitive": True}),
    ("Mespilia globulus", "蓝礼服海胆(燕尾服海胆)", "Tuxedo Urchin", "invert", "moderate", "peaceful", 8, 100,
     "藻食,啃食石头藻类", 1, 1, "印度-太平洋",
     "蓝黑相间的圆球海胆,除藻效率高。有'戴帽子'的习性——会背起碎珊瑚和小石子伪装,可能顺手搬走你的小珊瑚断枝,注意固定。", "无", "tradable",
     {"utility": "除藻", "copperSensitive": True, "decorator": True}),
    ("Linckia laevigata", "蓝海星", "Blue Linckia Starfish", "invert", "hard", "peaceful", 30, 200,
     "啃食微生物膜,人工投喂难以维持", 1, 1, "印度-太平洋",
     "颜色梦幻但极怕水质波动,入缸过水要 2 小时以上慢滴。很多个体会在数月内慢慢消瘦,只推荐成熟大缸尝试。", "无", "tradable",
     {"acclimation": "慢滴 2 小时+", "sensitivity": "高"}),
    ("Conus spp.", "鸡心螺(芋螺)", "Cone Snail", "invert", "expert", "aggressive", 10, 60,
     "肉食,捕食小鱼/蠕虫", 1, 0, "印度-太平洋",
     "毒液可致命的漂亮杀手,被蜇有生命危险,绝不建议家庭饲养,资料库收录仅作识别警示——野采或市场见到请远离,更别徒手碰。", "危险警示(非保护)", "tradable",
     {"dangerous": True, "venomous": True, "notRecommended": True}),
]

# ---------- 新设备: (品类, 品牌, 型号, keyParams JSON, 描述) ----------
EQUIPMENT = [
    ("灯具", "纽斯(Noopsyche)", "K7 II", {"功率": "90W", "适用缸": "45-60cm", "控制": "APP 日出日落/闪电模式", "参考价": "约 700 元"},
     "百元到千元档的国民软体灯,APP 易用,蓝光显色讨喜。45-60 缸单灯养软体/LPS 够用,SPS 需要双灯。"),
    ("灯具", "积光(Zetlight)", "ZA1201", {"功率": "55W", "适用缸": "40-50cm", "控制": "旋钮物理调光", "参考价": "约 400 元"},
     "旋钮调光皮实耐用,被动散热零噪音。功能朴素但稳定,适合不想要 APP 依赖的玩家。"),
    ("灯具", "迈光(Maxspect)", "R420r (Razr) 160W", {"功率": "160W", "适用缸": "60-90cm", "控制": "APP/控制器", "参考价": "约 2500 元"},
     "中端盘灯代表,覆盖面积大,光谱可编程,60-90 缸养 LPS/混养的高性价比选择。"),
    ("蛋分", "BM(Bubble Magus)", "NAC QQ1", {"适用水体": "≤100L", "类型": "内置挂缸式", "参考价": "约 200 元"},
     "nano 缸和检疫缸专用的小蛋分,挂在缸壁上就能用,小缸水质保险的便宜选择。"),
    ("蛋分", "红海(Red Sea)", "Reefer Skimmer RSK 300", {"适用水体": "≤300L", "泵": "Sicce PSK", "参考价": "约 2600 元"},
     "中高端成品缸配套蛋分,运行安静,收集杯拆卸顺手,适合一步到位不想折腾的玩家。"),
    ("主泵", "中科(ZKSJ)", "DC50Q-3000L", {"流量": "3000L/H", "功率": "22W", "控制": "直流变频 20 档", "参考价": "约 260 元"},
     "国产直流变频泵的性价比之选,静音不错,带喂食暂停模式。上水流量按缸体 5-8 倍选择档位。"),
    ("造浪", "捷宝(Jebao)", "RW-8", {"流量": "500-8000L/H", "控制": "控制器多模式", "参考价": "约 150 元"},
     "经典入门造浪,脉冲/恒流/随机模式齐全,坏了不心疼。注意定期拆洗防止盐垢卡转子。"),
    ("造浪", "迈光(Maxspect)", "Gyre XF-230", {"流量": "约 9000L/H", "特点": "环流片状水流", "参考价": "约 1500 元"},
     "环流(Gyre)设计推整缸水体做片状循环,死区少,适合 LPS 和 SPS 缸,比点射式造浪更接近自然海流。"),
    ("温控", "伊罕(EHEIM)", "Jager 加热棒 100W", {"功率": "100W", "适用缸": "≤100L", "控温": "机械旋钮 ±0.5℃", "参考价": "约 180 元"},
     "德国老牌加热棒,稳定性和耐用性口碑多年不倒。务必配合独立温度报警器使用,任何加热棒都可能失控。"),
    ("温控", "海利(Hailea)", "HC-150A 冷水机", {"制冷量": "1/10HP", "适用水体": "≤150L", "参考价": "约 900 元"},
     "南方夏季刚需设备,1/10 匹带 150L 以内水体。摆放注意散热间距,噪音类似小冰箱。"),
    ("补水", "卡默尔(Kamoer)", "ATO One 自动补水器", {"类型": "光学水位+防干烧", "泵": "内置蠕动泵", "参考价": "约 250 元"},
     "自动补充蒸发水维持盐度稳定,海缸最重要的'隐形设备'之一。光学探头比浮球式可靠,记得桶里只放纯水。"),
    ("测试", "莎利法(Salifert)", "KH/NO3/PO4 测试剂组合", {"类型": "滴定/比色", "精度": "KH 0.1dKH 级", "参考价": "约 60 元/瓶"},
     "玩家圈口碑试剂,KH 滴定法是公认的性价比精度之王。测试数据每周记录,趋势比单次绝对值更重要。"),
    ("测试", "哈纳(Hanna)", "HI772 碱度蛋机", {"类型": "电子比色计", "量程": "0-20 dKH", "参考价": "约 400 元"},
     "嫌滴定手抖的上蛋机,读数客观一致。试剂包是耗材,一支约 1 块钱,测 KH 比试纸靠谱得多。"),
    ("滴定", "卡默尔(Kamoer)", "X1 PRO-T 滴定泵", {"通道": "单通道", "精度": "步进电机 0.1ml", "控制": "APP/WiFi", "参考价": "约 600 元"},
     "国产智能滴定,自动补 KH/钙/镁解放双手。配合每日检测设定基线,是稳定 LPS 缸水质的利器。"),
    ("耗材", "红海(Red Sea)", "珊瑚盐(蓝桶)", {"规格": "7kg/22kg", "盐度": "按 35ppt 兑制", "参考价": "约 0.5 元/升水"},
     "元素配比均衡的入门海盐,开缸和日常换水都合适。溶解后建议 24 小时内用完,新水温度对齐缸温。"),
    ("耗材", "瞬时(Instant Ocean)", "海盐(紫桶)", {"规格": "25kg", "特点": "老牌稳定", "参考价": "约 0.35 元/升水"},
     "全球水族馆同款老牌,批次稳定性好,纯鱼缸/FOWLR 用它最划算,reef 缸建议上珊瑚盐。"),
]


def insert_species(rows):
    have = existing("scientific_name", "species")
    stmts = []
    for r in rows:
        if r[0] in have:
            continue
        stmts.append((
            "INSERT INTO species (scientific_name, common_name_zh, common_name_en, category, difficulty, temperament, max_size_cm, min_tank_l, diet, reef_safe_coral, reef_safe_invert, distribution, description, image_url, protection_level, trade_status, detail, data_source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'',?,?,?,?)",
            [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12], r[13], r[14], json.dumps(r[15], ensure_ascii=False), SRC],
        ))
    return stmts


def insert_equipment(rows):
    have = existing("brand || '|' || model", "equipment")
    stmts = []
    for cat, brand, model, params, desc in rows:
        if f"{brand}|{model}" in have:
            continue
        stmts.append((
            "INSERT INTO equipment (category, brand, model, key_params, description) VALUES (?,?,?,?,?)",
            [cat, brand, model, json.dumps(params, ensure_ascii=False), desc],
        ))
    return stmts


def main():
    sp_stmts = insert_species(FISH + CORALS + INVERTS)
    eq_stmts = insert_equipment(EQUIPMENT)
    # 分批执行,每批 15 条
    done = 0
    for batch in [sp_stmts[i:i + 15] for i in range(0, len(sp_stmts), 15)] + [eq_stmts[i:i + 15] for i in range(0, len(eq_stmts), 15)]:
        if batch:
            pipeline(batch)
            done += len(batch)
            print(f"已写入 {done} 条…")
    nsp = pipeline([("SELECT count(*) AS c FROM species", [])])[0]["response"]["result"]["rows"][0][0]["value"]
    neq = pipeline([("SELECT count(*) AS c FROM equipment", [])])[0]["response"]["result"]["rows"][0][0]["value"]
    print(f"\n完成:物种共 {nsp} 条,设备共 {neq} 条(本次新增 {done} 条,已存在的自动跳过)")


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    main()
