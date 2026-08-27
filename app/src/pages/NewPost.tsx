import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/lib/trpc";
import { getBoards, friendlyError } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import ImageUploadButton from "@/components/ImageUploadButton";

export default function NewPost() {
  const { me, loading } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<{ slug: string; name: string }[]>([]);
  const [boardSlug, setBoardSlug] = useState("newbie");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBoards().then((b) => setBoards(b));
  }, []);

  if (loading) return <p className="text-slate-400 py-10 text-center">加载中…</p>;
  if (!me)
    return (
      <div className="max-w-md mx-auto bg-white rounded-xl border border-sea-100 p-8 text-center">
        <p className="text-slate-600 mb-4">发帖前请先登录</p>
        <Link to="/login" className="bg-sea-700 text-white px-5 py-2 rounded-lg">去登录</Link>
      </div>
    );

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const { id } = await trpc.posts.create.mutate({ boardSlug, title, content });
      navigate(`/post/${id}`);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-sea-100 p-6 space-y-4">
      <h1 className="text-lg font-bold text-sea-900">发布新帖</h1>
      {!me.realName && (
        <div className="text-sm bg-sand-100 border border-sand-300 text-sand-500 rounded-lg p-3">
          按社区合规要求(跟帖评论后台实名制),发帖前请先完成
          <Link to="/profile" className="underline font-medium">实名登记</Link>。
          实名信息仅后台留存,前台不会展示。
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {boards.map((b) => (
          <button
            key={b.slug}
            onClick={() => setBoardSlug(b.slug)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${boardSlug === b.slug ? "bg-sea-700 text-white border-sea-700" : "border-sea-200 text-sea-700 hover:bg-sea-50"}`}
          >
            {b.name}
          </button>
        ))}
      </div>
      {boardSlug === "trade" && (
        <p className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-lg p-3">
          合规提示:二手置换版块禁止发布石珊瑚目(鹿角/脑珊瑚/榔头等)、砗磲、海马、海龟等国家保护野生动物相关交易信息,系统将先审后发。
        </p>
      )}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题(2-80 字)"
        className="w-full border border-sea-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sea-400"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        placeholder="正文(至少 5 字)。支持换行。"
        className="w-full border border-sea-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sea-400"
      />
      <div className="flex items-center gap-3 -mt-2">
        <ImageUploadButton
          onUploaded={(md) => setContent((c) => (c ? c + "\n" : "") + md)}
        />
        <p className="text-xs text-slate-400">
          点左边直接传照片(自动压缩);也可以把图床链接单独放一行,都会显示成图。
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || title.trim().length < 2 || content.trim().length < 5}
        className="bg-sea-700 hover:bg-sea-600 disabled:bg-slate-300 text-white px-6 py-2 rounded-lg transition"
      >
        {busy ? "发布中…" : "发布"}
      </button>
    </div>
  );
}
