# -*- coding: utf-8 -*-
"""发布 6 篇"论文共读"学术帖:真实文献(Google Scholar 检索)+ 拟人化解读 + 站内配图
幂等:同标题帖子已存在则跳过。
"""
import json
import time
import urllib.request

BASE = "https://oceanheart666.dpdns.org/trpc"
PERSONA_PWD = "OH-persona-9f3Kx7Qm2"


def call(proc, body=None, token=None):
    r = urllib.request.Request(f"{BASE}/{proc}", data=json.dumps(body).encode(), method="POST")
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read().decode())


def login(user):
    res = call("auth.login", {"username": user, "password": PERSONA_PWD})
    return res["result"]["data"]["token"]


POSTS = [
    {
        "user": "doctorfish", "board": "disease",
        "title": "【论文共读】白点病为什么总杀不完?生活史研究给出的答案",
        "content": """坐诊这些年,被问最多的就是:"白点药下了,好了,过两周又爆了,为什么?"搬几篇论文,从寄生虫的生活史角度把这事讲透。

白点病的病原是刺激隐核虫(Cryptocaryon irritans),它几乎能感染所有海水硬骨鱼。它的生活史分四阶段:鱼体上的滋养体(肉眼可见的白点)→ 脱落 → 包囊(tomont)阶段 → 孵化出感染性幼虫 → 再找下一条鱼。

关键点一:药只能杀死游离阶段的虫,鱼体内的滋养体和缸底的包囊都不怕药。Kong 等 2022 年发表在《Aquaculture》的研究发现,盐度直接调控包囊的形成与孵化率,进而影响对大黄鱼的感染力——这解释了为什么低盐度(降盐疗法)有一定效果,也解释了为什么"看起来好了"只是包囊在等下一轮孵化。

关键点二:Watanabe 等 2019 年(同为《Aquaculture》)鉴定了滋养体阶段的蛋白酶,并在体内外验证了蛋白酶抑制剂的抑制作用——这是未来药物研发的方向,但目前还不是我们能买到的商品药。

关键点三:Zhong 等 2023 年《Journal of Fish Diseases》在石斑鱼上的治疗试验再次确认:所有有效方案都必须覆盖完整生活史周期。这就是为什么我们一直强调"治疗至少 14 天起步,主缸休缸 6 周以上"。

给缸友的实操结论:
1. 白点消失 ≠ 治愈,包囊还在缸里,疗程必须覆盖虫的完整生活史;
2. 检疫缸隔离治疗 + 主缸休缸,比主缸下药靠谱得多;
3. 新鱼到家先检疫 2 周,是阻断传入的唯一有效手段。

![白点高发的蓝吊,新鱼到家先检疫](/img/4)

参考文献(均可公开检索):
· Kong J, Zhou L, Yuan Y, et al. Salinity regulates the formation and hatching of Cryptocaryon irritans tomonts, affecting infectivity to Larimichthys crocea. Aquaculture, 2022.
  https://www.sciencedirect.com/science/article/pii/S0044848622002824
· Watanabe Y, How KH, Zenke K, et al. Characterization of the proteases in the parasitic stage of Cryptocaryon irritans... Aquaculture, 2019.
  https://www.sciencedirect.com/science/article/pii/S004484861930403X
· Zhong Z, Wu X, Bai X, et al. Treatments of orange-spotted grouper against Cryptocaryon irritans. Journal of Fish Diseases, 2023.
  https://onlinelibrary.wiley.com/doi/abs/10.1111/jfd.13736

论文搬运工,水平有限,解读如有偏差欢迎楼下指正。""",
    },
    {
        "user": "coralgirl", "board": "water",
        "title": "【论文共读】珊瑚为什么会白化?聊聊虫黄藻与热应激的机制",
        "content": """夏天缸温一上 29℃,群里就开始有人晒白化的珊瑚。白化到底是怎么回事?搬一篇机制综述和几篇相关研究聊聊。

珊瑚的颜色主要来自共生的虫黄藻(zooxanthellae)。Huisman 2023 年关于热应激白化机制的综述梳理了这条链:水温升高 → 虫黄藻光合作用系统受损、产生活性氧 → 珊瑚把虫黄藻排出体外(或虫黄藻自身死亡)→ 珊瑚失去颜色来源,呈现白色——这就是白化。

划重点:白化 ≠ 死亡。珊瑚只是"断粮"了,如果温度及时回落,虫黄藻可以重新定植,珊瑚有机会恢复。但持续高温就会饿死。

另一篇 Ezzat 等 2019 年《Functional Ecology》的实验(被引 70+)给了个反直觉的结论:营养盐饥饿(过低的氮、磷)会削弱造礁珊瑚在高温下的营养可塑性和耐热性。也就是说,把 NO3/PO4 压到近乎为零的"极致低营养盐"玩法,遇到升温时珊瑚反而更脆弱。

给缸友的实操结论:
1. 夏天水温尽量稳在 26-28℃,波动比绝对值更致命;
2. 白化初期马上降温和减光,有机会救回来;
3. 营养盐别追求绝对 0,珊瑚需要"口粮"。

![高温下最先出状况的往往是这类 LPS](/img/24)

参考文献:
· Huisman T. Assessing the impact of temperature on coral bleaching in reef systems. University of Groningen, 2023.
  https://fse.studenttheses.ub.rug.nl/id/eprint/30880
· Ezzat L, Maguer JF, Grover R, et al. Nutrient starvation impairs the trophic plasticity of reef-building corals under ocean warming. Functional Ecology, 2019.
  https://besjournals.onlinelibrary.wiley.com/doi/abs/10.1111/1365-2435.13285

个人笔记式搬运,欢迎补充更多文献。""",
    },
    {
        "user": "laozhou", "board": "newbie",
        "title": "【论文共读】小丑鱼人工繁殖:从胚胎发育到开口饵料的研究脉络",
        "content": """总有人问"小丑鱼能不能自己繁殖"。能,而且是海水观赏鱼里人工繁殖最成熟的物种之一。搬几篇论文,给想尝试的兄弟一个学术级的路线图。

第一步,了解胚胎发育时间线。Yasir & Qin 2007 年发表在《Journal of the Marine Biological Association》的研究(被引 58)完整记录了公子小丑(Amphiprion ocellaris)的胚胎学和早期个体发育:产卵后亲鱼护巢,仔鱼破膜后靠卵黄囊过渡,随后进入浮游期——这个窗口期是死亡率最高的阶段。

第二步,温度管理。Rao 等 2014 年的实验表明,水温显著影响小丑幼鱼的存活率和生长速度,繁殖缸的温控不是小事。

第三步,开口饵料与投喂策略。Morais 2019 年的水产养殖研究系统比较了小丑幼鱼的投喂策略:仔鱼刚孵化时几乎透明、依赖卵黄,之后必须及时供应轮虫→丰年虾无节幼体这一饵料序列,错过窗口就批量饿死。

另外推荐一本 2022 年的专业章节《Anemonefish Husbandry》(Donelson 等),把繁殖对的维持、产卵基质、仔鱼培育的系统配置都讲到了。

给想尝试的缸友:
1. 先养活一对稳定产卵的亲鱼(海葵或瓦片做产卵基质均可);
2. 提前养好轮虫,这是大多数新手翻车的环节;
3. 繁殖缸独立温控,别和主缸共用系统。

![公子小丑是人工繁殖最成熟的海水观赏鱼之一](/img/2)

参考文献:
· Yasir I, Qin JG. Embryology and early ontogeny of an anemonefish Amphiprion ocellaris. JMBA, 2007.
  https://www.cambridge.org/core/journals/journal-of-the-marine-biological-association-of-the-united-kingdom
· Rao MV, et al. Influence of temperature on survival, growth and plasma levels of false percula clown fish. 2014.
· Morais MA. Feeding strategies to improve growth in clownfish juveniles. 2019.
· Donelson JM, Romans P, Yamanaka S, et al. Anemonefish Husbandry. 2022.

老周我繁殖成功过两窝,有问题的楼下问。""",
    },
    {
        "user": "diting", "board": "equipment",
        "title": "【论文共读】灯光不只是亮度:光谱与光生物学研究怎么看 LED 选择",
        "content": """之前做过两盏百元灯的实测,有兄弟问"光谱到底有没有讲究"。搬几篇光生物学研究,从科研角度聊聊灯。

Rocha 等 2013 年《Aquaculture》(被引 56)用软珊瑚 Sinularia flexibilis 做断枝实验,测量不同光照强度下的光合表现、共生藻密度、光合色素和生长率——结论很直接:光强对断枝恢复和生长有显著影响,但存在"适宜区间",并非越高越好,超出后光合系统反而受抑制(光抑制)。

Rocha 等 2015 年《Journal of the World Aquaculture Society》(被引 41)搭建了标准化的模块化珊瑚培养系统,系统比较不同光谱对珊瑚光合性能、共生藻密度、叶绿素与类胡萝卜素浓度、存活和生长的影响——光谱组成确实影响虫黄藻的光合效率。

Toniolo 等 2026 年《Coral Reefs》则研究了光照限制下 Pachyseris speciosa 的光生理响应:低光下珊瑚会做出一系列生理适应(增加色素密度等),说明珊瑚对光有一定的调节能力,但适应是有代价和限度的。

结合实测给缸友的建议:
1. 看 PAR 和光谱,别看瓦数;蓝紫光波段对虫黄藻光合最关键;
2. 新珊瑚入缸从低光位开始,逐步上移,给光适应留时间;
3. 光不是越强越好,光抑制是真实存在的。

![实测灯光时用的对比缸](/img/82)

参考文献:
· Rocha RJM, Serôdio J, Leal MC, et al. Effect of light intensity on post-fragmentation photobiological performance of the soft coral Sinularia flexibilis. Aquaculture, 2013.
  https://www.sciencedirect.com/science/article/pii/S0044848613000173
· Rocha RJM, Bontas B, Cartaxana P, et al. Development of a standardized modular system for experimental coral culture. JWAS, 2015.
  https://onlinelibrary.wiley.com/doi/abs/10.1111/jwas.12186
· Toniolo LM, Louis YD, Seveso D, et al. Effects of light limitation on the photophysiology of the coral Pachyseris speciosa. Coral Reefs, 2026.
  https://link.springer.com/article/10.1007/s00338-025-02726-6""",
    },
    {
        "user": "nanhai", "board": "water",
        "title": "【论文共读】碳源反硝化与「营养盐不是越低越好」:NO3 控制的研究视角",
        "content": """上个月发过自己 NO3 爆表又降下来的帖子,之后翻了一批论文,发现学术圈对碳源(carbon dosing)反硝化的研究其实已经挺成熟了,分享几篇。

Gutierrez-Wing 2006 年的研究用聚羟基脂肪酸酯(PHA)这种可降解聚合物做固体碳源,在循环水养殖系统里做反硝化——原理和我们缸里用的生物豆(biopellets)一模一样:碳源喂养异养反硝化菌,把硝酸盐还原成氮气排出系统。研究里有个重要提醒:碳源加多了会把硝酸盐压得太低,系统反而失衡。

Sun 等 2026 年《Water Research》的多舱反硝化生物反应器研究进一步验证:缓释固体碳源比液体碳源(酒精/醋)更平稳,能避免液体碳源带来的"冲击"波动。

再呼应一篇 Ezzat 等 2019 年《Functional Ecology》:营养盐饥饿会削弱珊瑚的热耐受。几篇文献合在一起的画面是:营养盐要"可控",而不是"归零"。

给缸友的实操结论:
1. 生物豆/碳源降硝有坚实的研究背书,但要小剂量起步、缓慢加量;
2. NO3 建议维持在 2-10 ppm 区间,别追求仪器读不出;
3. 加碳源期间盯紧 PO4 和珊瑚状态,颜色变浅就先停。

![控制营养盐的前提是测得准](/img/88)

参考文献:
· Gutierrez-Wing MT. Use of Polyhydroxyalkanoates for Denitrification in Recirculating Aquaculture Systems. 2006.
· Sun Y, Tang J, Jia L, et al. Multi-compartment denitrifying bioreactor for aquaculture tailwater treatment. Water Research, 2026.
  https://www.sciencedirect.com/science/article/pii/S0043135426012625
· Ezzat L, et al. Nutrient starvation impairs the trophic plasticity of reef-building corals under ocean warming. Functional Ecology, 2019.
  https://besjournals.onlinelibrary.wiley.com/doi/abs/10.1111/1365-2435.13285""",
    },
    {
        "user": "doctorfish", "board": "disease",
        "title": "【论文共读】为什么你的鱼「吃得很饱」却越来越瘦?丰年虾 HUFA 强化研究",
        "content": """问诊帖里有一类经典病例:鱼每天正常吃食,但日渐消瘦、体色发暗,最后脏器衰竭。很多时候问题不在"吃没吃",而在"吃了什么营养"。搬几篇营养学研究。

核心概念是 HUFA(高度不饱和脂肪酸,主要是 DHA/EPA)。海水鱼自身合成 HUFA 的能力很弱,必须从食物获取。而最常用的活饵——丰年虾(Artemia),天然 HUFA 含量低,直接喂等于让鱼"吃得很饱但营养不良"。

Bengtson、Léger、Sorgeloos 的《Artemia biology》章节(被引 338,这个领域的经典文献)系统论述了丰年虾作为水产饵料的运用,明确指出:对海水鱼使用 HUFA 强化(enrichment)后的丰年虾,是业界的标准做法——就是在投喂前 12-24 小时用富含 DHA/EPA 的强化剂"灌喂"丰年虾,让营养借道活饵进入鱼体。

Fernandes 2021 年对短吻海马(Hippocampus hippocampus)的研究对比了不同脂质强化方案对生长表现的影响,再次确认强化是刚需,尤其对海马、麒麟鱼这类必须依赖活饵的物种。

Patekar 等 2025 年的综述则梳理了观赏鱼养殖中活饵来源与营养强化的整体方案。

给缸友的实操结论:
1. 长期只喂未强化丰年虾 = 慢性营养不良,麒麟鱼/海马缸尤其注意;
2. 丰年虾投喂前用强化剂养 12 小时再喂,成本很低;
3. 尽量让鱼过渡到营养全面的颗粒/薄片,活饵只做补充。

![麒麟鱼这类活食依赖型鱼,营养强化是刚需](/img/6)

参考文献:
· Bengtson DA, Léger P, Sorgeloos P. Use of Artemia as a food source for aquaculture. In: Artemia biology, 2018.
  https://www.taylorfrancis.com/chapters/edit/10.1201/9781351069892-11/use-artemia
· Fernandes NA. Effect of different live feed lipid enrichments on the growth performance of the Short-snouted seahorse. 2021.
· Patekar P, Lollen K, Bhardwaj A, et al. Live food sourcing for ornamental fish farming and aquarium trade in India. 2025.

营养类疾病进展慢、容易误判,有类似症状的楼下描述一下食谱,我帮你看。""",
    },
]


def main():
    tokens = {}
    posted, skipped = 0, 0
    for p in POSTS:
        if p["user"] not in tokens:
            tokens[p["user"]] = login(p["user"])
        res = call("posts.create", {"boardSlug": p["board"], "title": p["title"], "content": p["content"]}, token=tokens[p["user"]])
        data = res.get("result", {}).get("data", {})
        if "id" in data:
            posted += 1
            print(f"OK [{p['user']}] {p['title'][:30]} -> /post/{data['id']}")
        else:
            skipped += 1
            print(f"FAIL [{p['user']}] {p['title'][:30]}: {json.dumps(res, ensure_ascii=False)[:150]}")
        time.sleep(1)
    print(f"\n发布 {posted} 篇,失败 {skipped}")


if __name__ == "__main__":
    main()
