# -*- coding: utf-8 -*-
"""往线上论坛灌入拟人化种子内容:6 个真实感用户 + 12 篇实用帖 + 互动评论点赞。
通过线上 tRPC API 操作(等同真人发帖),幂等:检测到标记帖已存在则跳过。
用法: python scripts/seed_live.py
"""
import io
import json
import os
import sys
import urllib.parse
import urllib.request

BASE = "https://oceanheart666.dpdns.org/trpc"
# 敏感凭据从环境变量读取,不要写进仓库(本文件会被 push 到公开仓库)
ADMIN = ("admin", os.environ.get("OCEAN_ADMIN_PASSWORD", ""))
REEFER = ("reefer", os.environ.get("OCEAN_REEFER_PASSWORD", ""))


def call(path, payload=None, token=None, method=None):
    """tRPC v11 裸格式:query 走 GET ?input=,mutation 走 POST 裸 JSON"""
    url = f"{BASE}/{path}"
    data = None
    if payload is not None and method != "GET":
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    elif payload is not None:
        url += "?input=" + urllib.parse.quote(json.dumps(payload, ensure_ascii=False))
    req = urllib.request.Request(url, data=data, method="POST" if data else "GET")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # 读出错误响应体里的业务信息(如"用户名已存在")
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            raise RuntimeError(f"{path}: HTTP {e.code}")
    if "error" in body:
        raise RuntimeError(f"{path}: {body['error'].get('message')}")
    return body["result"]["data"]


def try_call(path, payload=None, token=None):
    try:
        return call(path, payload, token)
    except Exception as e:
        return {"__error__": str(e)}


# ---------- 拟人化用户 ----------
# 密码从环境变量读取(线上账号已轮换,明文不入库)
PERSONA_PWD = os.environ.get("OCEAN_PERSONA_PASSWORD", "")
PERSONAS = [
    {"username": "laozhou", "password": PERSONA_PWD, "nickname": "老周聊海缸", "realName": "周建军"},
    {"username": "coralgirl", "password": PERSONA_PWD, "nickname": "珊瑚小姐姐", "realName": "林晓彤"},
    {"username": "xiaobai", "password": PERSONA_PWD, "nickname": "入海三个月", "realName": "王梓豪"},
    {"username": "doctorfish", "password": PERSONA_PWD, "nickname": "鱼大夫", "realName": "陈建国"},
    {"username": "nanhai", "password": PERSONA_PWD, "nickname": "南海渔夫", "realName": "黄海涛"},
    {"username": "diting", "password": PERSONA_PWD, "nickname": "滴定不手抖", "realName": "吴敏"},
]

# ---------- 帖子: (作者, 版块, 标题, 正文) ----------
POSTS = [
    ("xiaobai", "newbie", "60 天开缸全记录:从自来水爆藻到小丑入缸,我踩过的 7 个坑",
     """缸是 60 背滤,8 月 1 号开的缸,今天正好 60 天,小丑入缸一周状态稳定,把过程记下来给后来的兄弟参考。

第 1-7 天:活石爆藻期。千万别开灯!我头三天开灯想"看效果",结果绿毛藻直接起飞,后面多花了两周压制。

第 8-20 天:测水期。NH4 先升后降,NO2 跟上升再归零,这个周期谁都逃不掉,每天测一次就行,别手贱加任何东西。

第 21 天:NO3 降到 5 以下,我急着下鱼,被群里老周拦住了——又养了一周水,事实证明他是对的。

坑总结:
1. 自来水直接开缸(应该用 RO 水,我后来全换了)
2. 爆藻期开灯
3. 光学盐度计没校准就用(差了 0.003!)
4. 活石买少了,造景不够用
5. 蛋分第一天就开最大档,打不出来还以为自己买错了
6. 急着下生物
7. 没买温度计报警器,加热棒失控那天是报警器救的缸

总开销:缸+设备+耗材约 3800,比预算超了 600,主要是中途换 RO 机。有问题随便问,知无不言。"""),
    ("diting", "newbie", "RO 机到底买几级?算完这笔账我省了 400 块",
     """新手最常问的问题之一。直接上结论:养海水 4 级足够(棉+炭+RO 膜+DI 树脂),5 级 6 级是营销。

关键看两个数:
1. TDS 脱盐率:RO 膜出口 ≤ 自来水的 5% 就算合格,我家自来水 220,RO 出口 8,DI 出口 0。
2. 产水量:75GPD(每天约 280 升)对小缸足够,100GPD 以上适合 200L+ 或懒人。

DI 树脂是耗材,变色就换,一升能用多久取决于你当地水质,北京这边我一年换两次,一次 30 块。

别买带压力桶的直饮机改装款,那个桶是给喝水设计的,对开缸大量用水没意义还占地方。

我的方案:无桶 400GPD 四级机,活动时 380 入手,同等配置带桶款要 780。这笔账供参考。"""),
    ("laozhou", "newbie", "盐度计不校准等于白测:光学盐度计的正确打开方式",
     """见过太多新手拿着没校准的光学盐度计跟我争"我盐度明明 1.025"。哥们,你那表可能偏了 0.004。

校准方法:
标准做法是买 35ppt 校准液(十几块钱一支),滴一滴,调螺丝到 1.0264(35ppt 对应的比重)。
千万别用纯净水归零法校准后再直接读比重——光学盐度计的刻度是非线性的,零点对了 35ppt 处照样偏。

没有校准液的应急方案:用纯净水归零后,目标盐度往下压 0.001-0.002 养,偏差点比乱调强。

读数时注意:样品和表要同温,差 5 度读数能差 0.001。从冰箱拿出来的校准液先捂手里焐热。

进阶玩家可以直接上数显盐度计,记得每月用校准液核一次。"""),
    ("coralgirl", "showcase", "90 缸一周年:从空缸到小森林(附完整开销清单)",
     """去年今天开的缸,90×45×45 底滤,今天满周岁,发帖纪念。

一年下来的变化:开缸前三个月基本什么都没长,第四个月开始纽扣爆发,现在石头表面铺满了;榔头从 3 头长到 11 头,奶嘴海葵分裂过一次,送了一只给同城鱼友。

生物:一对公子小丑(已配对,天天在奶嘴旁边秀恩爱)、一条黄金吊、一只美人虾、若干马蹄螺。

完整开销清单(不含交学费浪费的钱):
- 缸+底柜+底滤: 2600
- 灯(纽斯 K7 二代): 750
- 蛋分(八爪鱼 150): 680
- 造浪两个: 400
- 加热棒+冷水机: 900
- 盐+耗材+试剂: 约 800/年
- 生物: 约 1200
合计约 7300。灯光设备二手收的,省了不少。

一句话心得:这个爱好最贵的不是设备,是耐心。前三个月什么都没发生的时候,别折腾,就是对缸最好的照顾。"""),
    ("doctorfish", "disease", "白点病实战:不下药,检疫缸+升温断食 14 天治愈全记录",
     """上周接诊(其实是救自己缸):新入的蓝吊第 3 天全身白点,典型的刺激隐核虫。

先说结论:主缸有珊瑚不能下铜,我的方案是捞鱼进检疫缸,升温+断食+观察,14 天转阴。

时间线:
D1:发现白点,鱼还抢食。当天下检疫缸(20L 小缸,气石+加热棒+一小块活石)。
D2-4:白点爆发期,最多的那天数了 40 多个点。温度从 25 缓升到 28(每天 1 度)。
D5-7:白点开始脱落,这是虫体成熟离体,不是好转,别高兴太早。
D8-10:虫体在底砂孵化,每天吸底换水 1/3,物理减少数量。
D11-14:鱼体表干净,继续观察到第 14 天无复发,回主缸。

要点:
1. 升温是加速虫体生命周期,不是烫死虫,28 度够了别上 30
2. 断食是我个人的做法,减少水质波动,鱼瘦点死不了
3. 主缸空置期(鱼不在)继续保持 6 周,虫没宿主会自然死绝
4. 预防永远大于治疗:新鱼必须先检疫 2 周再入主缸,别学我偷懒

欢迎补充不同方案,下铜的兄弟也可以聊聊。"""),
    ("xiaobai", "disease", "求助:小丑鱼鳍边缘发白,是不是烂鳍?(附水质)",
     """各位大佬帮忙看看。公子小丑,入缸两周,昨天开始胸鳍边缘有一圈白色,像被烫过的塑料边,鱼倒是还正常吃食游动。

水质:NO3=10,PO4=0.05,KH=8.2,温度 26,盐度 1.024(校准过的)。
缸里还有一条同类,两条是同时买的一对,另一条完全正常。

是被咬了还是烂鳍病?需要捞出来吗?在线等,挺急的。"""
     ),
    ("laozhou", "equipment", "蛋分买多大?\"3 倍水体\"是商家话术,看这两个参数才靠谱",
     """蛋分标称\"适用 300L\"基本都是按最理想状态吹的,所谓 3 倍水体论更是玄学。真正要看的是:

1. 针刷泵功率和气量:进气量(升/小时)才是硬指标,同价位选气量大的。
2. 收集杯直径:直径越大越不容易打翻,细高杯颜值高性能差。

我的经验公式:实际饲养水体 × 1.5 = 蛋分标称适用水体。也就是说 200L 的缸,买标称 300L 的蛋分刚好,别信\"买大不买小\",蛋分过大打不干净反而频繁调水位。

另外几个使用细节:
- 新蛋分有磨合期,头两周打不出脏东西是正常的,膜没形成
- 进气口每月拆下来刷一次,盐垢堵了性能掉一半
- 蛋分出水口套个滤袋,能有效减少微气泡

预算有限的话,国产一线(八爪鱼、博特、BM)完全够用,没必要硬上 BK。"""
     ),
    ("laozhou", "equipment", "纽斯 K7 vs 积光 ZA1201:软体缸百元灯 3 个月实测",
     """两个灯都挂在 45 方缸上养了 3 个月软体(纽扣、皮革、闪千手),说点真实感受。

光谱:K7 的蓝光更讨喜,肉眼观感通透;ZA1201 偏白一点,显色偏真实。养软体两者都够,别指望养 SPS。

PAR 实测(水下 20cm):K7 中心约 180,ZA1201 约 150。边缘衰减都厉害,45 缸单灯就是中间亮四周暗,养纽扣没问题,榔头放正下方也能活。

控制:K7 的 APP 确实好用,日出日落模式是刚需功能;ZA1201 的旋钮调光反而皮实,不怕 APP 抽风。

发热和噪音:K7 风扇有轻微高频声,夜深人静能听到;ZA1201 被动散热无声但烫手。

结论:要省心要 APP 选 K7,要皮实静音选 ZA1201,软体缸都不亏。预算 300 以内二手 K7 是这个价位的最优解。"""
     ),
    ("diting", "water", "KH 每天掉 0.3 正常吗?我连续测了 30 天的数据",
     """先说结论:正常,而且说明你的缸在生长。

我的 90 缸,LPS 为主,连续 30 天每天固定早上 8 点测 KH(莎利法试剂),数据如下:
起始 8.5,日均消耗 0.2-0.4 dKH,珊瑚状态好的那几周消耗明显更快。30 天从 8.5 一路到需要干预的 7.0 以下只用了三周(没补的情况下)。

几个反常识的发现:
1. 换水补 KH 的效率极低:10% 换水只能拉回 0.1-0.2,指望换水稳 KH 不现实
2. 消耗速度和光照时长正相关,灯开 10 小时比 8 小时每天多掉 0.05 左右
3. 手抖误差:同一瓶水连测三次能差 0.3,所以单次数据别当真,看趋势

解决方案:上了小苏打饱和溶液手动滴定,每天早上 20ml,KH 稳定在 8.0±0.3。等钙反好价再升级。

测水质这事,勤快比设备重要。"""
     ),
    ("diting", "water", "NO3 爆表 50+ 降不下来?我的三管齐下方案(2 周降到 5)",
     """翻缸边缘走了一遭:出差两周托家人喂鱼,回来 NO3 直接 50+,PO4 0.3,皮革珊瑚都缩了。

处理方案(三管齐下):
1. 换水打底:连续 3 天每天换 20%,直接从 50 拉到 25 左右。别信\"每天 10% 慢慢来\",爆表的时候就得下猛药,注意新水温度盐度对齐就行。
2. 碳源助攻:每天 2ml 白醋(对,就是厨房白醋,本质是乙酸碳源),蛋分湿打,一周后 NO3 到 12。
3. 断根:喂量减半,每天一顿,冰冻饵先挤干汁水再喂(那层汁水全是磷)。

两周后 NO3=5,PO4=0.08,珊瑚重新舒展。

教训:托人喂鱼宁可饿着不能多喂,鱼饿两周没事,水质崩了才要命。现在我出门直接贴张纸条在缸上:每天一次,指甲盖大小。"""
     ),
    ("nanhai", "id", "缸里石头上的白色小螺旋是什么?要不要除掉?",
     """新手必问系列。活石入缸几周后,石头和缸壁上出现很多白色的小螺旋圈,像迷你蚊香,这是螺旋虫(龙介虫)的石灰质管。

结论:无害,甚至可以说是水质好的标志之一。它们是滤食性的,吃水里的悬浮颗粒,不伤害任何生物。

需要注意的只有一点:数量爆发说明水体营养盐偏高(喂多了),它们本身没错,是个 indicator。

真正要警惕的\"不速之客\"是这几种:
- 垃圾葵:褐色小海葵,会蜇珊瑚,发现马上处理
- 刚毛虫:大部分无害,但大号个体可能抓小鱼小虾
- 扁虫:看种类,吃珊瑚的要命

鉴定帖发图建议:开白光灯拍、带参照物(硬币/尺子)、说清发现位置,这样大家才好帮你认。"""
     ),
    ("coralgirl", "trade", "置换:奶嘴海葵分裂苗一只,换纽扣任一簇(北京自提)",
     """家里奶嘴又分裂了,缸里实在摆不下,出一只分裂苗,大小约 5cm,已定养一个月,状态稳定,触手饱满。

只想置换不想卖:换一簇纽扣(颜色不限,看眼缘)或者一小段闪千手也行。

坐标北京朝阳,仅自提,当面看状态大家都放心。交易走平台担保或者直接互换,都行。

合规说明:奶嘴海葵非保护物种,放心换。国家保护的那些珊瑚贝类别来问,平台也不让发。"""
     ),
    ("nanhai", "local", "北京鱼友集合!周末十里河扫货搭子招募",
     """坐标北京,每两周去一次十里河花鸟鱼虫市场扫货,主要看耗材和工具螺,偶尔淘二手设备。

最近几次的战况汇报:
- 马蹄螺 10 只 15 块(比网购便宜一半)
- 海盐活动价整桶入,划下来每升水成本 4 毛
- 淘到 9 成新造浪,原价 300 的 120 拿下

招募固定搭子:人多可以拼单买盐买 RO 膜,还能现场帮着挑生物看状态。老手新手都欢迎,新手跟着逛能少交很多学费。

下周六上午 10 点,有意的回帖报名,够 3 人就成行。"""
     ),
]

# ---------- 评论: (帖子标题关键字, 作者, 内容) ----------
COMMENTS = [
    ("60 天开缸全记录", "laozhou", "总结得很实在。第七条最有价值,加热棒失控是海水缸第一大杀手,几十块的报警器能救几千块的生物。"),
    ("60 天开缸全记录", "diting", "自来水开缸这个坑我也踩过,氯气对硝化系统杀伤太大。补充一句:换 RO 水不用全换,每天换 20% 连换一周就行,生物不受罪。"),
    ("60 天开缸全记录", "coralgirl", "3800 开到这个状态很省了!我当年交学费交到 5000 才入门,哈哈。"),
    ("RO 机到底买几级", "xiaobai", "感谢!正准备买,差点就下单 6 级带桶款了,还好刷到这个帖子。"),
    ("RO 机到底买几级", "laozhou", "补充一个:RO 膜选陶氏或汇通的通用膜,别买专用接口的,后期换膜便宜一半。"),
    ("盐度计不校准", "xiaobai", "难怪!我用纯净水归零测的,一直以为自己 1.025,按这个说法我可能只有 1.022…马上买校准液。"),
    ("90 缸一周年", "laozhou", "\"最贵的不是设备是耐心\",这句话值一个精华。前三个月不动手,胜过大多数折腾。"),
    ("90 缸一周年", "doctorfish", "配对的小丑状态好会开始产卵哦,留意奶嘴旁边的石头,说不定有惊喜。"),
    ("90 缸一周年", "xiaobai", "冷水机 900 是全新的还是二手的?北京夏天感觉离不开这个。"),
    ("白点病实战", "laozhou", "检疫缸这条太关键了。我见过太多人新鱼直接进主缸,一次白点团灭整缸的。"),
    ("白点病实战", "coralgirl", "马住!学习下,希望永远用不上,哈哈。"),
    ("小丑鱼鳍边缘发白", "doctorfish", "看描述更像被另一条啄的——小丑配对期雌鱼会啄雄鱼立威,胸鳍边缘发白+另一条完全正常,典型特征。先观察:如果白边不再扩大、鱼吃食正常,保持水质就行,一周左右自愈。如果白边扩散或出现棉絮状再捞出来下黄粉。另外建议:缸里加点遮蔽物,给弱势那条躲的地方。"),
    ("小丑鱼鳍边缘发白", "xiaobai", "谢谢鱼大夫!确实是小的那条被啄,今天看已经开始好转了,放了块活石给它躲。虚惊一场。"),
    ("蛋分买多大", "diting", "\"蛋分过大打不干净\"这条是真的,我 100L 缸上过标称 500 的,天天调水位调到崩溃,换小的反而稳。"),
    ("纽斯 K7", "coralgirl", "K7 用户报到,APP 的闪电模式我家小丑很喜欢(好吧其实是我自己喜欢看)。"),
    ("KH 每天掉 0.3", "laozhou", "数据党好评!小苏打方案注意别手抖加猛了,KH 一天涨 0.5 以内才安全。"),
    ("KH 每天掉 0.3", "xiaobai", "请问莎利法和某宝十几块的 KH 测试剂差别大吗?"),
    ("NO3 爆表", "nanhai", "\"托人喂鱼宁可饿着\"太真实了,我出差回来 PO4 直接 0.5,家人说怕鱼饿着一天喂三顿……"),
    ("白色小螺旋", "xiaobai", "原来无害!我昨天还用镊子刮了半天,心疼我的手。"),
    ("奶嘴海葵分裂苗", "nanhai", "朝阳区+1,可惜我纽扣刚定养,等我的爆了来找你换。"),
    ("北京鱼友集合", "laozhou", "报名一个。十里河周三好像更便宜?不过周末时间友好,我都可以。"),
    ("北京鱼友集合", "coralgirl", "想去!正好要买盐,拼单带我一个。"),
]


def find_post_id(keyword):
    """按标题关键字找已存在的帖子 id,找不到返回 None"""
    r = call("posts.list", {"q": keyword}, method="GET")
    items = r.get("items", [])
    return items[0]["id"] if items else None


def main():
    # 1. 注册/登录 6 个用户,完成实名
    tokens = {}
    for p in PERSONAS:
        r = try_call("auth.register", {"username": p["username"], "password": p["password"], "nickname": p["nickname"]})
        if "__error__" in r:
            if "已存在" in r["__error__"]:
                r = call("auth.login", {"username": p["username"], "password": p["password"]})
            else:
                raise RuntimeError(r["__error__"])
        tokens[p["username"]] = r["token"]
        try_call("auth.setRealName", {"realName": p["realName"]}, tokens[p["username"]])
        print(f"用户就绪: {p['nickname']}")

    # reefer 登录(已有实名)
    tokens["reefer"] = call("auth.login", {"username": REEFER[0], "password": REEFER[1]})["token"]
    admin = call("auth.login", {"username": ADMIN[0], "password": ADMIN[1]})["token"]

    # 2. 发帖(已存在的跳过并复用 id,可断点续跑)
    post_ids = {}
    for author, board, title, content in POSTS:
        kw = title[:12]
        pid = find_post_id(kw)
        if pid:
            print(f"已存在,跳过 [{board}] {title[:20]}...")
        else:
            r = call("posts.create", {"boardSlug": board, "title": title, "content": content}, tokens[author])
            pid = r["id"]
            print(f"发帖 OK [{board}] {title[:20]}...")
        post_ids[title] = pid

    # 3. 回帖互动(该作者已在此帖回过则跳过)
    skipped = done = 0
    for kw, author, content in COMMENTS:
        pid = next((v for k, v in post_ids.items() if kw in k), None)
        if not pid:
            print(f"!! 未找到帖子: {kw}")
            continue
        existing = call("comments.list", {"postId": pid}, method="GET")
        if any(c["author"] == next(p["nickname"] for p in PERSONAS if p["username"] == author) for c in existing):
            skipped += 1
            continue
        call("comments.create", {"postId": pid, "content": content}, tokens[author])
        done += 1
    print(f"回帖完成: 新增 {done} 条, 跳过 {skipped} 条")

    # 4. 点赞(toggle 接口,先查 liked 状态避免误取消)
    like_plan = {
        "60 天开缸全记录": ["laozhou", "coralgirl", "diting", "doctorfish", "reefer"],
        "白点病实战": ["laozhou", "coralgirl", "xiaobai", "reefer"],
        "90 缸一周年": ["laozhou", "diting", "xiaobai", "doctorfish", "nanhai"],
        "盐度计不校准": ["xiaobai", "diting", "reefer"],
        "蛋分买多大": ["diting", "xiaobai", "coralgirl"],
        "RO 机到底买几级": ["xiaobai", "laozhou"],
        "NO3 爆表": ["nanhai", "laozhou", "coralgirl"],
        "KH 每天掉 0.3": ["laozhou", "xiaobai"],
        "白色小螺旋": ["xiaobai", "coralgirl"],
        "纽斯 K7": ["coralgirl", "diting"],
        "小丑鱼鳍边缘发白": ["doctorfish"],
        "北京鱼友集合": ["laozhou", "coralgirl", "reefer"],
        "置换:奶嘴海葵": ["nanhai"],
    }
    n = 0
    for kw, users in like_plan.items():
        pid = next((v for k, v in post_ids.items() if kw in k), None)
        if not pid:
            continue
        for u in users:
            detail = call("posts.byId", {"id": pid}, tokens[u], method="GET")
            if not detail.get("liked"):
                call("posts.toggleLike", {"postId": pid}, tokens[u])
                n += 1
    print(f"点赞完成: {n} 次")

    # 5. 管理员设精华 + 官方互动
    for kw in ["60 天开缸全记录", "白点病实战", "盐度计不校准"]:
        pid = next((v for k, v in post_ids.items() if kw in k), None)
        if pid:
            detail = call("posts.byId", {"id": pid}, admin, method="GET")
            if detail.get("isEssence") != 1:
                call("admin.setEssence", {"postId": pid, "isEssence": True}, admin)
            if not detail.get("liked"):
                call("posts.toggleLike", {"postId": pid}, admin)
    help_pid = next(v for k, v in post_ids.items() if "小丑鱼鳍边缘发白" in k)
    existing = call("comments.list", {"postId": help_pid}, method="GET")
    if not any(c["author"] == "海洋之心官方" for c in existing):
        call("comments.create", {
            "postId": help_pid,
            "content": "问题已解决就好!以后遇到鱼病可以先查资料库里的物种卡,也可以直接发帖 @鱼大夫,咱们社区热心人多。记得新鱼入缸前先检疫哦。",
        }, admin)
    print("精华设置 + 官方互动完成")

    print("\n全部完成!")


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    main()
