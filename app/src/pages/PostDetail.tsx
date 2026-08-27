import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ThumbsUp, Star, Eye, Award, Trash2, BadgeCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getPost, getComments, isFallbackMode, friendlyError } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { fmtTime } from "@/lib/format";
import ImageUploadButton from "@/components/ImageUploadButton";

type Post = {
  id: number; title: string; content: string; views: number; isEssence: number; createdAt: number;
  boardSlug: string; boardName: string; author: string; authorRole: string; likeCount: number;
  liked: boolean; favorited: boolean;
};
type Comment = { id: number; content: string; createdAt: number; author: string; authorRole: string };

// 支持外链图片(https…jpg/png/webp/gif)与站内上传图(/img/123)
const IMG_LINE = /^(?:!\[.*?\]\()?(?:https?:\/\/\S+?\.(?:png|jpe?g|gif|webp)(?:\?\S*)?|\/img\/\d+)\)?$/i;

// 正文渲染:普通文字按换行展示,独占一行的图片链接(或 markdown 图片语法)渲染成图
function RichContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm leading-7 text-slate-700">
      {lines.map((line, i) => {
        const t = line.trim();
        if (IMG_LINE.test(t)) {
          const url = t.replace(/^!\[.*?\]\(/, "").replace(/\)$/, "");
          return (
            <img
              key={i}
              src={url}
              alt="帖子配图"
              loading="lazy"
              className="my-3 max-w-full max-h-96 rounded-lg border border-sea-100 object-contain bg-sea-50"
              onError={(e) => {
                // 图挂了就降级成链接,不留破图
                const el = e.currentTarget;
                const a = document.createElement("a");
                a.href = url;
                a.textContent = url;
                a.className = "text-sea-600 underline break-all";
                a.target = "_blank";
                el.replaceWith(a);
              }}
            />
          );
        }
        return <p key={i} className="min-h-[1em] whitespace-pre-wrap break-words">{line}</p>;
      })}
    </div>
  );
}

export default function PostDetail() {
  const { id } = useParams();
  const postId = Number(id);
  const { me } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    getPost(postId).then((p) => setPost(p as Post));
    getComments(postId).then((c) => setComments(c as Comment[]));
  };
  useEffect(load, [postId]);

  // 浏览量:同一浏览器会话对同一帖只计一次,刷新/点赞不涨量
  useEffect(() => {
    if (isFallbackMode()) return;
    const key = `viewed:${postId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    trpc.posts.view.mutate({ id: postId }).catch(() => {});
  }, [postId]);

  if (!post) return <p className="text-slate-400 py-10 text-center">加载中…</p>;

  const isAdmin = me?.role === "admin";

  const toggleLike = async () => {
    if (isFallbackMode()) return setError("静态演示模式下无法点赞,需要完整后端服务");
    if (!me) return setError("请先登录");
    await trpc.posts.toggleLike.mutate({ postId });
    const p = await getPost(postId);
    setPost(p as Post);
  };
  const toggleFav = async () => {
    if (isFallbackMode()) return setError("静态演示模式下无法收藏,需要完整后端服务");
    if (!me) return setError("请先登录");
    await trpc.posts.toggleFavorite.mutate({ postId });
    const p = await getPost(postId);
    setPost(p as Post);
  };
  const submitComment = async () => {
    setError("");
    if (isFallbackMode()) return setError("静态演示模式下无法回帖,需要完整后端服务");
    if (!me) return setError("请先登录后再回帖");
    try {
      await trpc.comments.create.mutate({ postId, content: draft });
      setDraft("");
      load();
    } catch (e: any) {
      setError(friendlyError(e));
    }
  };

  // ---------- 管理操作 ----------
  const toggleEssence = async () => {
    await trpc.admin.setEssence.mutate({ postId, isEssence: post.isEssence !== 1 });
    const p = await getPost(postId);
    setPost(p as Post);
  };
  const removePost = async () => {
    if (!window.confirm("确定删除这个帖子吗?评论、点赞、收藏会一起清掉,不可恢复。")) return;
    await trpc.admin.deletePost.mutate({ postId });
    navigate(`/board/${post.boardSlug}`);
  };
  const removeComment = async (commentId: number) => {
    if (!window.confirm("确定删除这条回帖吗?")) return;
    await trpc.admin.deleteComment.mutate({ commentId });
    getComments(postId).then((c) => setComments(c as Comment[]));
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <article className="bg-white rounded-xl border border-sea-100 p-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          {post.isEssence === 1 && (
            <span className="flex items-center gap-0.5 text-sand-500 font-medium"><Award className="w-3.5 h-3.5" /> 精华</span>
          )}
          <Link to={`/board/${post.boardSlug}`} className="bg-sea-100 text-sea-700 px-2 py-0.5 rounded hover:bg-sea-200">
            {post.boardName}
          </Link>
          <span className={post.authorRole === "admin" ? "text-sea-600 font-medium" : ""}>{post.author}</span>
          <span>{fmtTime(post.createdAt)}</span>
          <span className="flex items-center gap-1 ml-auto"><Eye className="w-3.5 h-3.5" />{post.views}</span>
        </div>
        <h1 className="text-xl font-bold text-sea-900 mb-4">{post.title}</h1>
        <RichContent text={post.content} />
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-sea-100">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm border transition ${post.liked ? "bg-sea-700 text-white border-sea-700" : "border-sea-200 text-sea-700 hover:bg-sea-50"}`}
          >
            <ThumbsUp className="w-4 h-4" /> {post.likeCount}
          </button>
          <button
            onClick={toggleFav}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm border transition ${post.favorited ? "bg-sand-400 text-sea-950 border-sand-400" : "border-sea-200 text-sea-700 hover:bg-sea-50"}`}
          >
            <Star className="w-4 h-4" /> {post.favorited ? "已收藏" : "收藏"}
          </button>
          {isAdmin && (
            <span className="flex gap-2 ml-auto">
              <button
                onClick={toggleEssence}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-sand-400 text-sand-500 hover:bg-sand-100 transition"
              >
                <BadgeCheck className="w-3.5 h-3.5" /> {post.isEssence === 1 ? "取消精华" : "设为精华"}
              </button>
              <button
                onClick={removePost}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-red-200 text-red-500 hover:bg-red-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> 删帖
              </button>
            </span>
          )}
        </div>
      </article>

      <section className="bg-white rounded-xl border border-sea-100 p-6">
        <h2 className="font-bold text-sea-900 mb-4">全部回帖 ({comments.length})</h2>
        <div className="space-y-4">
          {comments.map((c, i) => (
            <div key={c.id} className="border-b border-sea-50 last:border-0 pb-3">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <span className={c.authorRole === "admin" ? "text-sea-600 font-medium" : "text-slate-700"}>{c.author}</span>
                {" · "}{fmtTime(c.createdAt)} · {i + 1} 楼
                {isAdmin && (
                  <button onClick={() => removeComment(c.id)} className="ml-auto text-red-400 hover:text-red-600" title="删除此回帖">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <RichContent text={c.content} />
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-400">还没有回帖,来抢沙发。</p>}
        </div>
        <div className="mt-5">
          {me && !me.realName && (
            <p className="text-xs text-sand-500 mb-2">
              按社区合规要求,回帖需要先在<Link to="/profile" className="underline">个人中心</Link>完成实名登记(后台实名,前台不展示)。
            </p>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder={me ? "友善交流,分享你的经验…" : "登录后才能回帖"}
            disabled={!me}
            className="w-full border border-sea-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sea-400 disabled:bg-slate-50"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={submitComment}
              disabled={!me || draft.trim().length === 0}
              className="bg-sea-700 hover:bg-sea-600 disabled:bg-slate-300 text-white text-sm px-5 py-2 rounded-lg transition"
            >
              发表回复
            </button>
            {me && (
              <ImageUploadButton
                disabled={!me}
                onUploaded={(md) => setDraft((d) => (d ? d + "\n" : "") + md)}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
