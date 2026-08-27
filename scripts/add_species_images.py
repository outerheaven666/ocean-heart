# -*- coding: utf-8 -*-
"""批量给物种配图:Wikimedia Commons 搜学名 -> 960px 缩略图 -> 上传本站 /img -> 更新 species.image_url
幂等:已有 image_url 的物种自动跳过。支持 --limit/--offset 分批跑(避免单次超时)。
环境变量:TURSO_AUTH_TOKEN
用法: python scripts/add_species_images.py [--limit 30] [--offset 0]
"""
import argparse
import base64
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request

TURSO_URL = "https://ocean-heart-outerheaven666.aws-us-east-1.turso.io/v2/pipeline"
TOKEN = os.environ["TURSO_AUTH_TOKEN"]
SITE = "https://oceanheart666.dpdns.org"
UA = {"User-Agent": "OceanHeartWikiBot/1.0 (marine aquarium reference site image fetch)"}
MAX_BIN = 440_000  # 上传接口 base64 <= 600_000 字符

ADMIN_USER = "admin"
ADMIN_PASS = "OH-0Yf2-Audn84i"


def http_json(url, headers=None, data=None, method=None):
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        r.add_header(k, v)
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read().decode())


def commons_get(url, retries=3):
    """Commons 请求带 429 退避重试"""
    for i in range(retries):
        try:
            r = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(r, timeout=90) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < retries - 1:
                wait = 25 * (i + 1)
                print(f"    429 限速,等待 {wait}s 后重试…")
                time.sleep(wait)
                continue
            raise


def turso(sql, args=()):
    def arg(v):
        if v is None:
            return {"type": "null"}
        if isinstance(v, int):
            return {"type": "integer", "value": str(v)}
        return {"type": "text", "value": str(v)}

    reqs = [{"type": "execute", "stmt": {"sql": sql, "args": [arg(a) for a in args]}}, {"type": "close"}]
    body = http_json(TURSO_URL, {"Authorization": f"Bearer {TOKEN}"}, json.dumps({"requests": reqs}).encode(), "POST")
    r0 = body["results"][0]
    if r0["type"] == "error":
        raise RuntimeError(r0["error"]["message"])
    res = r0["response"]["result"]
    cols = [c["name"] for c in res["cols"]]
    return [{cols[i]: row[i].get("value") for i in range(len(cols))} for row in res["rows"]]


def commons_search(name):
    """按名称搜 Commons 图片,返回 (thumburl, mime, title) 列表"""
    q = urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": name, "gsrnamespace": "6", "gsrlimit": "8",
        "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": "960",
    })
    d = json.loads(commons_get(f"https://commons.wikimedia.org/w/api.php?{q}"))
    time.sleep(3)  # 遵守 Commons 机器人限速
    out = []
    for page in (d.get("query", {}).get("pages", {}) or {}).values():
        for ii in page.get("imageinfo", []):
            if ii.get("mime") in ("image/jpeg", "image/png") and ii.get("thumburl"):
                out.append((ii["thumburl"], ii["mime"], page.get("title", "")))
    return out


def download(url):
    data = commons_get(url)
    time.sleep(1)
    return data


def login():
    res = http_json(f"{SITE}/trpc/auth.login", data=json.dumps({"username": ADMIN_USER, "password": ADMIN_PASS}).encode(), method="POST")
    return res["result"]["data"]["token"]


def upload(token, mime, raw):
    b64 = base64.b64encode(raw).decode()
    res = http_json(
        f"{SITE}/trpc/images.upload",
        {"Authorization": f"Bearer {token}"},
        json.dumps({"mime": mime, "data": b64}).encode(),
        "POST",
    )
    return res["result"]["data"]  # {id, url}


def pick_image(sci, en):
    """多级 fallback 搜索"""
    tries = [f'intitle:"{sci}"', sci]
    genus = sci.split()[0] if sci else ""
    if en:
        tries.append(f'intitle:"{en.split("(")[0].strip()}" fish')
    if genus:
        tries.append(f'intitle:"{genus}"')
    for t in tries:
        try:
            hits = commons_search(t)
        except Exception as e:
            print(f"    search '{t}' failed: {e}")
            continue
        # 跳过明显不相关的(地图/图标/绘图)
        good = [h for h in hits if not any(b in h[2].lower() for b in ("map", "range", "icon", "logo", "drawing", "diagram", ".svg"))]
        if good:
            return good[0]
        time.sleep(0.2)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=100)
    ap.add_argument("--offset", type=int, default=0)
    args = ap.parse_args()

    rows = turso("SELECT id, scientific_name, common_name_en, common_name_zh FROM species WHERE image_url='' ORDER BY id")
    todo = rows[args.offset : args.offset + args.limit]
    print(f"待配图 {len(rows)} 种,本批 {len(todo)} 种 (offset={args.offset})")
    if not todo:
        return

    token = login()
    print("admin 登录成功")

    ok, miss = 0, []
    for sp in todo:
        sid, sci, en, zh = sp["id"], sp["scientific_name"], sp["common_name_en"], sp["common_name_zh"]
        try:
            hit = pick_image(sci, en or "")
            if not hit:
                miss.append((sid, zh, sci))
                print(f"[{sid}] MISS {zh} ({sci})")
                continue
            thumb, mime, title = hit
            raw = download(thumb)
            if len(raw) > MAX_BIN and "width=960" in thumb:
                raw = download(thumb.replace("width=960", "width=640"))
            if len(raw) > MAX_BIN:
                miss.append((sid, zh, sci))
                print(f"[{sid}] TOO BIG {zh} {len(raw)}B")
                continue
            up = upload(token, mime, raw)
            turso("UPDATE species SET image_url=? WHERE id=?", (up["url"], int(sid)))
            ok += 1
            print(f"[{sid}] OK {zh} -> {up['url']} ({len(raw)//1024}KB) <- {title[:60]}")
        except Exception as e:
            miss.append((sid, zh, sci))
            print(f"[{sid}] ERR {zh}: {e}")
        time.sleep(0.2)

    print(f"\n本批完成: 成功 {ok}, 失败 {len(miss)}")
    if miss:
        print("未配到图的:", json.dumps(miss, ensure_ascii=False))


if __name__ == "__main__":
    main()
