import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, MessageSquare, ThumbsUp, Eye, Award, CloudOff } from "lucide-react";
import { getBoards, getPosts, isFallbackMode } from "@/lib/data";
import { fmtTime } from "@/lib/format";

type Board = { id: number; slug: string; name: string; description: string; postCount: number };
type Post = {
  id: number; title: string; content: string; views: number; isEssence: number; createdAt: number;
  boardSlug: string; boardName: string; author: string; likeCount: number; commentCount: number;
};

export function PostItem({ p }: { p: Post }) {
  return (
    <Link
      to={`/post/${p.id}`}
      className="block bg-white rounded-lg border border-sea-100 hover:border-sea-300 hover:shadow-md transition p-4"
    >
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
        {p.isEssence === 1 && (
          <span className="flex items-center gap-0.5 text-sand-500 font-medium">
            <Award className="w-3.5 h-3.5" /> 精华
          </span>
        )}
        <span className="bg-sea-100 text-sea-700 px-2 py-0.5 rounded">{p.boardName}</span>
        <span>{p.author}</span>
        <span>{fmtTime(p.createdAt)}</span>
      </div>
      <h3 className="font-semibold text-sea-900 mb-1 line-clamp-1">{p.title}</h3>
      <p className="text-sm text-slate-600 line-clamp-2 mb-2">{p.content}</p>
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{p.views}</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{p.commentCount}</span>
        <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{p.likeCount}</span>
      </div>
    </Link>
  );
}

export default function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [fallback, setFallback] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getBoards().then((b) => {
      setBoards(b as Board[]);
      setFallback(isFallbackMode());
    });
    getPosts({ page: 1 }).then((r) => {
      setPosts(r.items as Post[]);
      setTotal(r.total);
      setFallback(isFallbackMode());
    });
  }, []);

  const search = () => {
    if (!q.trim()) return;
    getPosts({ q: q.trim(), page: 1 }).then((r) => {
      setPosts(r.items as Post[]);
      setTotal(r.total);
    });
  };

  return (
    <div className="space-y-6">
      {fallback && (
        <div className="flex items-center gap-2 bg-sand-100 border border-sand-300 text-sand-500 text-sm rounded-lg px-4 py-2.5">
          <CloudOff className="w-4 h-4 shrink-0" />
          静态演示模式:当前为内置种子数据(与本地预览内容一致),登录/发帖等交互需要完整后端服务。
        </div>
      )}
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-sea-900 via-sea-800 to-sea-600 text-white p-8 shadow-xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">中国海水观赏玩家的一站式家园</h1>
        <p className="text-sea-200 mb-5 text-sm md:text-base">
          权威生物资料库 × 玩家交流社区 × 合规商家服务 —— 重建中文海水生物图鉴
        </p>
        <div className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="搜索帖子:开缸 / 白点 / 设备…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-sand-400"
            />
          </div>
          <button onClick={search} className="bg-sand-400 hover:bg-sand-500 text-sea-950 font-medium px-5 rounded-lg transition">
            搜索
          </button>
          <button onClick={() => navigate("/species")} className="hidden sm:block bg-sea-700 hover:bg-sea-600 px-5 rounded-lg transition">
            查资料库
          </button>
        </div>
      </section>

      {/* 版块导航 */}
      <section>
        <h2 className="font-bold text-sea-900 mb-3">社区版块</h2>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
          {boards.map((b) => (
            <Link
              key={b.id}
              to={`/board/${b.slug}`}
              className="bg-white border border-sea-100 rounded-lg p-3 text-center hover:border-sea-400 hover:shadow transition"
              title={b.description}
            >
              <div className="text-sm font-medium text-sea-800">{b.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{b.postCount} 帖</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 帖子流 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sea-900">最新讨论</h2>
          <span className="text-xs text-slate-400">共 {total} 帖</span>
        </div>
        <div className="space-y-3">
          {posts.map((p) => (
            <PostItem key={p.id} p={p} />
          ))}
          {posts.length === 0 && <p className="text-sm text-slate-400 py-8 text-center">暂无帖子</p>}
        </div>
      </section>
    </div>
  );
}
