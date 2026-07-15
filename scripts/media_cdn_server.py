#!/usr/bin/env python3
"""
Koharu Media CDN — permanent-ish multi-device vault files on your PC.

Serves media/ with CORS + range requests (video seeking).
Upload API so phones/PCs can push files into cloud-visible storage.

  GET  /                        → index
  GET  /index.json              → catalog for Vercel list API
  GET  /koharu/videos/file.mp4  → file
  POST /v1/upload               → multipart (fields: companion, kind, file)
       Header: x-media-secret: <same as FOOOCUS_BRIDGE_SECRET or MEDIA_CDN_SECRET>
"""
from __future__ import annotations

import cgi
import json
import os
import re
import socketserver
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(
    os.environ.get(
        "MEDIA_ROOT",
        str(Path(__file__).resolve().parent.parent / "media"),
    )
).resolve()
PORT = int(os.environ.get("MEDIA_CDN_PORT", "8890"))
SECRET = (
    os.environ.get("MEDIA_CDN_SECRET")
    or os.environ.get("FOOOCUS_BRIDGE_SECRET")
    or ""
).strip()

SAFE_NAME = re.compile(r"^[A-Za-z0-9._\- ()[\]]+$")
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v", ".mkv"}


def is_media(name: str) -> bool:
    ext = Path(name).suffix.lower()
    return ext in IMAGE_EXT or ext in VIDEO_EXT


def media_type(name: str) -> str:
    return "video" if Path(name).suffix.lower() in VIDEO_EXT else "image"


def build_index() -> dict:
    items: list[dict] = []
    if not ROOT.exists():
        return {"ok": True, "root": str(ROOT), "items": [], "count": 0}
    for companion_dir in sorted(ROOT.iterdir()):
        if not companion_dir.is_dir() or companion_dir.name.startswith("."):
            continue
        companion = companion_dir.name
        for kind in ("library", "videos", "generated"):
            d = companion_dir / kind
            if not d.is_dir():
                continue
            for f in sorted(d.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
                if not f.is_file() or not is_media(f.name):
                    continue
                st = f.stat()
                rel = f"{companion}/{kind}/{f.name}"
                items.append(
                    {
                        "id": f"{kind}:{f.name}",
                        "companionId": companion,
                        "kind": kind,
                        "mediaType": media_type(f.name),
                        "name": f.name,
                        "path": rel,
                        "url": f"/{rel}",
                        "size": st.st_size,
                        "mtime": int(st.st_mtime * 1000),
                        "storage": "cdn",
                    }
                )
    return {
        "ok": True,
        "root": str(ROOT),
        "count": len(items),
        "items": items,
        "generated_at": int(time.time()),
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS, POST")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, x-media-secret, x-user-email, x-user-tier",
        )
        self.send_header("Cache-Control", "public, max-age=3600")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path in ("/", "/health"):
            body = json.dumps(
                {"ok": True, "service": "koharu-media-cdn", "root": str(ROOT)}
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/index.json":
            body = json.dumps(build_index()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path.rstrip("/") != "/v1/upload":
            self.send_error(404, "Not found")
            return

        secret = self.headers.get("x-media-secret") or ""
        if SECRET and secret != SECRET:
            self.send_error(401, "Unauthorized")
            return

        ctype = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in ctype:
            self.send_error(400, "multipart/form-data required")
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": ctype,
                "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
            },
        )

        companion = (form.getvalue("companion") or "koharu").strip().lower()
        companion = re.sub(r"[^a-z0-9_-]", "", companion) or "koharu"
        kind = (form.getvalue("kind") or "library").strip().lower()
        if kind not in ("library", "videos", "generated"):
            kind = "library"

        file_item = form["file"] if "file" in form else None
        if file_item is None or not getattr(file_item, "file", None):
            # also accept "files"
            file_item = form["files"] if "files" in form else None
        if file_item is None or not getattr(file_item, "filename", None):
            self.send_error(400, "Missing file field")
            return

        original = Path(file_item.filename or "upload.bin").name
        if not is_media(original):
            self.send_error(400, "Unsupported type")
            return
        safe = original.replace("..", "_")
        if not SAFE_NAME.match(safe):
            safe = re.sub(r"[^\w.\-]", "_", safe)

        # Route videos to videos/
        ext = Path(safe).suffix.lower()
        if ext in VIDEO_EXT and kind == "library":
            kind = "videos"
        if ext in IMAGE_EXT and kind == "videos":
            kind = "library"

        dest_dir = ROOT / companion / kind
        dest_dir.mkdir(parents=True, exist_ok=True)
        # unique
        stem, suf = Path(safe).stem, Path(safe).suffix
        dest = dest_dir / safe
        n = 1
        while dest.exists():
            dest = dest_dir / f"{stem}-{n}{suf}"
            n += 1

        data = file_item.file.read()
        if len(data) > 5 * 1024 * 1024 * 1024:
            self.send_error(400, "Max 5GB")
            return
        dest.write_bytes(data)

        rel = f"{companion}/{kind}/{dest.name}"
        body = json.dumps(
            {
                "ok": True,
                "storage": "cdn",
                "permanent": True,
                "saved": [
                    {
                        "id": f"{kind}:{dest.name}",
                        "companionId": companion,
                        "kind": kind,
                        "mediaType": media_type(dest.name),
                        "name": dest.name,
                        "path": rel,
                        "url": f"/{rel}",
                        "size": len(data),
                        "mtime": int(time.time() * 1000),
                        "storage": "cdn",
                    }
                ],
                "count": 1,
            }
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("[media-cdn]", fmt % args)


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    for c in ("koharu",):
        for k in ("library", "videos", "generated"):
            (ROOT / c / k).mkdir(parents=True, exist_ok=True)

    print(f"Koharu Media CDN → {ROOT}")
    print(f"Listening http://127.0.0.1:{PORT}")
    print(f"Auth secret enabled → {bool(SECRET)}")
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
