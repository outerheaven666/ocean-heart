# -*- coding: utf-8 -*-
"""把 app/dist-pages 全量推送到 gh-pages 分支(GitHub Contents API,branch=gh-pages)"""
import base64
import io
import json
import subprocess
import urllib.request
from pathlib import Path

REPO = "outerheaven666/ocean-heart"
BRANCH = "gh-pages"
SRC = Path(r"D:\GitHub项目\海洋之心\app\dist-pages")
API = f"https://api.github.com/repos/{REPO}/contents/"


def get_token():
    out = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        capture_output=True, text=True, cwd=r"D:\GitHub项目\海洋之心",
    ).stdout
    for line in out.splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("no token")


def req(url, token, method="GET", payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bearer {token}")
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def main():
    token = get_token()
    files = [p for p in SRC.rglob("*") if p.is_file()]
    files.append(None)  # placeholder for .nojekyll
    for p in files:
        if p is None:
            rel, content = ".nojekyll", b""
        else:
            rel = p.relative_to(SRC).as_posix()
            content = p.read_bytes()
        url = API + rel
        sha = None
        status, body = req(f"{url}?ref={BRANCH}", token)
        if status == 200 and isinstance(body, dict):
            sha = body.get("sha")
        payload = {
            "message": f"pages: 指向 oceanheart666.dpdns.org 的全功能备用入口 ({rel})",
            "content": base64.b64encode(content).decode(),
            "branch": BRANCH,
        }
        if sha:
            payload["sha"] = sha
        status, body = req(url, token, method="PUT", payload=payload)
        if status in (200, 201):
            print(f"OK  {rel}")
        else:
            print(f"FAIL {rel}: {status} {body}")


if __name__ == "__main__":
    main()
