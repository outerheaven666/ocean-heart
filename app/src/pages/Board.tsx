import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getBoards, getPosts } from "@/lib/data";
import { PostItem } from "./Home";
import { useTitle } from "@/lib/title";

type Post = Parameters<typeof PostItem>[0]["p"];

export default function Board() {
  const { slug } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [boardName, setBoardName] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  useTitle(boardName || "版块");

  useEffect(() => {
    setPage(1);
  }, [slug]);

  useEffect(() => {
    getPosts({ boardSlug: slug, page }).then((r) => {
      setPosts(r.items as Post[]);
      setTotal(r.total);
      if (r.items[0]) setBoardName(r.items[0].boardName);
    });
    getBoards().then((bs) => {
      const b = bs.find((x) => x.slug === slug);
      if (b) setBoardName(b.name);
    });
  }, [slug, page]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-sea-900">{boardName || "版块"}</h1>
        {slug === "trade" && (
          <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded">
            本版块实行保护物种先审后发:石珊瑚/砗磲/海马等禁发
          </span>
        )}
      </div>
      <div className="space-y-3">
        {posts.map((p) => (
          <PostItem key={p.id} p={p} />
        ))}
        {posts.length === 0 && (
          <div className="bg-white rounded-lg border border-sea-100 p-10 text-center text-slate-400 text-sm">
            本版块还没有帖子,<Link to="/new" className="text-sea-600 underline">来发第一帖</Link>
          </div>
        )}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-sm ${page === i + 1 ? "bg-sea-700 text-white" : "bg-white border border-sea-200 text-sea-700"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
