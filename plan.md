# 「海洋之心」海水论坛项目 — 执行蓝图

## 目标
打造国内海水观赏鱼/海缸玩家垂直社区「海洋之心」，兼具：
- to C：玩家交流论坛 + 生物/设备资料数据库查询
- to B：商家入驻/推广、行业数据服务
- 最终交付：可部署上线的全栈 Web 应用

## 阶段设计

### Stage 0 — 需求确认
- 通过 ask_user 确认：MVP 范围、技术形态、资料库数据来源、部署目标
- 产出：确认后的需求基线

### Stage 1 — 产品规划文档
- 编排者直接产出：完整执行方案（产品架构、功能清单、商业模式、里程碑、Kimi work 模式分工）
- 产出：/mnt/agents/output/海洋之心-执行方案.md

### Stage 2 — 竞品与内容调研（如用户确认进入执行）
- 加载 deep-research-swarm，调研国内海水圈社区现状（cmfishing/海友网/贴吧/微信群生态）、生物资料库结构（鱼种/珊瑚/水质参数）
- 产出：调研简报 + 数据库 schema 设计依据

### Stage 3 — 全栈开发
- 加载 vibecoding-webapp-swarm + webapp-building-swarm + backend-building-swarm + swarm-workspace
- 前端：React + Tailwind 论坛 UI（版块、帖子、资料库、搜索）
- 后端：tRPC + Drizzle + Hono + MySQL，用户/帖子/生物数据/商家模块
- 产出：可运行全栈项目

### Stage 4 — 部署与版本交付
- mshtools-website_version_manager build_version（type: dynamic）
- 产出：可预览访问的线上版本
