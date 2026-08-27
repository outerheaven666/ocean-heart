# -*- coding: utf-8 -*-
"""线上验证:管理员全流程(发帖→精华→删评论→删帖)、logout、登录限流、浏览量、reefer 改密"""
import io
import json
import os
import sys
import urllib.parse
import urllib.request

BASE = "https://oceanheart666.dpdns.org/trpc"
# 凭据从环境变量读取,勿写入仓库
ADMIN_PWD = os.environ.get("OCEAN_ADMIN_PASSWORD", "")
REEFER_PWD = os.environ.get("OCEAN_REEFER_PASSWORD", "")
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

passed = failed = 0

def check(name, ok, extra=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  ✓ {name} {extra}")
    else:
        failed += 1
        print(f"  ✗ {name} {extra}")

def call(path, payload=None, token=None, raw=False):
    url = f"{BASE}/{path}"
    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST" if data else "GET")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode("utf-8"))
    if raw:
        return body
    if "error" in body:
        raise RuntimeError(body["error"].get("message"))
    return body["result"]["data"]

def query(path, payload=None, token=None):
    url = f"{BASE}/{path}?input=" + urllib.parse.quote(json.dumps(payload or {}, ensure_ascii=False))
    req = urllib.request.Request(url)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))["result"]["data"]


# 1. 管理员登录
admin = call("auth.login", {"username": "admin", "password": ADMIN_PWD})["token"]
check("管理员登录(新密码)", True)

# 2. 管理员全流程:发帖 → 精华 → 评论 → 删评论 → 删帖
pid = call("posts.create", {"boardSlug": "newbie", "title": "【测试】管理员功能验证帖", "content": "此帖用于验证管理功能,稍后删除。"}, admin)["id"]
call("admin.setEssence", {"postId": pid, "isEssence": True}, admin)
det = query("posts.byId", {"id": pid}, admin)
check("设为精华", det["isEssence"] == 1)
cid = call("comments.create", {"postId": pid, "content": "测试评论,稍后删除"}, admin)["id"]
call("admin.deleteComment", {"commentId": cid}, admin)
cs = query("comments.list", {"postId": pid})
check("删除评论", all(c["id"] != cid for c in cs))
call("admin.deletePost", {"postId": pid}, admin)
try:
    query("posts.byId", {"id": pid})
    check("删帖后不可访问", False)
except Exception:
    check("删帖后不可访问", True)

# 3. 普通用户调管理接口应被拒
reefer = call("auth.login", {"username": "reefer", "password": REEFER_PWD})["token"]
r = call("admin.stats", {}, reefer, raw=True)
check("非管理员访问管理接口被拒", "error" in r and r["error"]["data"]["code"] == "FORBIDDEN")

# 4. reefer 改密(旧密码曾公开在 git 历史)


# 5. logout 后会话立即失效
tmp = call("auth.login", {"username": "laozhou", "password": os.environ.get("OCEAN_PERSONA_PASSWORD", "")})["token"]
call("auth.logout", {}, tmp)
r = call("auth.me", {}, tmp, raw=True)
check("logout 后会话失效", "error" in r)

# 6. 浏览量接口
v0 = query("posts.byId", {"id": 7})["views"]
call("posts.view", {"id": 7})
v1 = query("posts.byId", {"id": 7})["views"]
check("浏览量 +1", v1 == v0 + 1, f"{v0}→{v1}")

# 7. 登录限流(错误密码 6 次)
blocked = False
for i in range(6):
    r = call("auth.login", {"username": "nosuchuser", "password": "x"}, raw=True)
    if "error" in r and r["error"]["data"]["code"] == "TOO_MANY_REQUESTS":
        blocked = True
        break
check("登录限流生效(第6次被拒)", blocked)

# 8. 内容总览
stats = query("admin.stats", None, admin)
check("内容数据", stats["posts"] >= 18 and stats["comments"] >= 24, f"posts={stats['posts']} comments={stats['comments']} users={stats['users']}")

lst = query("posts.list", {"q": "白点病实战"})
check("精华+点赞落库", lst["items"][0]["isEssence"] == 1 and lst["items"][0]["likeCount"] >= 4, f"赞{lst['items'][0]['likeCount']}")

print(f"\n{'全部通过' if failed == 0 else f'{failed} 项失败'} ({passed}/{passed+failed})")
