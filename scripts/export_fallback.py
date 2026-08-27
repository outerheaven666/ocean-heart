# -*- coding: utf-8 -*-
"""从线上 API 导出最新数据快照到 app/src/lib/fallback.json(静态演示模式用)"""
import io
import json
import sys
import urllib.parse
import urllib.request

BASE = "https://oceanheart666.dpdns.org/trpc"


def query(path, payload=None):
    url = f"{BASE}/{path}?input=" + urllib.parse.quote(json.dumps(payload or {}, ensure_ascii=False))
    with urllib.request.urlopen(url, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))["result"]["data"]


def main():
    boards = query("boards.list")
    # 拉全部帖子(分页)
    posts, page = [], 1
    while True:
        r = query("posts.list", {"page": page})
        posts.extend(r["items"])
        if len(posts) >= r["total"]:
            break
        page += 1
    comments = []
    for p in posts:
        for c in query("comments.list", {"postId": p["id"]}):
            comments.append({"postId": p["id"], **c})
    data = {
        "boards": boards,
        "posts": posts,
        "comments": comments,
        "species": query("species.list"),
        "waterParams": query("waterParams.list"),
        "equipment": query("equipment.list"),
        "merchants": query("merchants.list"),
    }
    out = io.open("app/src/lib/fallback.json", "w", encoding="utf-8")
    json.dump(data, out, ensure_ascii=False, separators=(",", ":"))
    out.close()
    print(f"boards={len(boards)} posts={len(posts)} comments={len(comments)} species={len(data['species'])} water={len(data['waterParams'])} equip={len(data['equipment'])} merchants={len(data['merchants'])}")


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    main()
