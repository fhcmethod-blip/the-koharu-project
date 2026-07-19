#!/usr/bin/env python3
"""
Fooocus bridge for The Koharu Project (public-tunnel ready).

Listens on :8888 and talks to Fooocus Gradio UI (:7865).

  GET  /health
  POST /v1/generation/text-to-image   (sync — long)
  POST /v1/jobs                       (async start)
  GET  /v1/jobs/{id}                  (poll)

Auth (recommended when exposed via Cloudflare):
  Header: x-bridge-secret: <FOOOCUS_BRIDGE_SECRET>
"""

from __future__ import annotations

import argparse
import base64
import copy
import json
import os
import re
import shutil
import threading
import time
import traceback
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
import uvicorn

FOOOCUS_URL = os.environ.get("FOOOCUS_URL", "http://127.0.0.1:7865")
FOOOCUS_OUTPUTS = Path(
    os.environ.get(
        "FOOOCUS_OUTPUTS",
        r"D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\Fooocus\outputs",
    )
)
# Permanent site library on THIS PC: media/{companionId}/generated/
MEDIA_ROOT = Path(
    os.environ.get(
        "MEDIA_ROOT",
        str(Path(__file__).resolve().parent.parent / "media"),
    )
).resolve()
# Public CDN base (tunnel) so clients can deep-link saved files
MEDIA_PUBLIC_BASE = (
    os.environ.get("MEDIA_PUBLIC_BASE")
    or os.environ.get("NEXT_PUBLIC_MEDIA_PUBLIC_BASE")
    or "https://fooocus.thekoharuproject.com/media-cdn"
).rstrip("/")
BRIDGE_SECRET = os.environ.get("FOOOCUS_BRIDGE_SECRET", "").strip()
DEFAULTS_PATH = Path(__file__).with_name("fooocus_fn67_defaults.json")
# Fooocus 2.5.5 Gradio deps (probe /config if these break after UI changes):
#   generate_button.click → then get_task (ctrls) → then generate_clicked (task)
#   fn 68 = get_task (153 inputs: currentTask + grid + prompt + …)
#   fn 69 = generate_clicked (1 input: task args list / AsyncTask)
# Koharu patch on Fooocus webui.py: get_task returns serializable list.
FN_GET_TASK = 68
FN_GENERATE = 69
SAFE_COMPANION = re.compile(r"[^a-zA-Z0-9_-]+")
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

app = FastAPI(title="Koharu Fooocus Bridge", version="1.4.0")
# CORS outermost so phones (Safari) get proper preflight + cross-origin responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["GET", "POST", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

_client = None
_defaults: list[Any] | None = None
_jobs: dict[str, dict[str, Any]] = {}
_jobs_lock = threading.Lock()
_gen_lock = threading.Lock()  # Fooocus is single-GPU; serialize gens
# Last companion used by a site job — watcher uses this for unattributed Fooocus UI gens
_last_companion_id = "koharu"
_last_companion_lock = threading.Lock()
# Paths already ingested into media/ (avoid double-copy)
_ingested_sources: set[str] = set()
_ingested_sizes: set[int] = set()  # size fingerprints to block duplicate copies
_ingested_lock = threading.Lock()


def require_secret(x_bridge_secret: str | None = Header(default=None)):
    if not BRIDGE_SECRET:
        return
    if (x_bridge_secret or "") != BRIDGE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid bridge secret")


def load_defaults() -> list[Any]:
    global _defaults
    if _defaults is not None:
        return copy.deepcopy(_defaults)
    if not DEFAULTS_PATH.exists():
        raise RuntimeError(f"Missing defaults file: {DEFAULTS_PATH}")
    with open(DEFAULTS_PATH, "r", encoding="utf-8") as f:
        _defaults = json.load(f)
    return copy.deepcopy(_defaults)


def get_client():
    global _client
    if _client is None:
        from gradio_client import Client

        _client = Client(FOOOCUS_URL)
    return _client


def list_output_images() -> set[Path]:
    if not FOOOCUS_OUTPUTS.exists():
        return set()
    return {
        p
        for p in FOOOCUS_OUTPUTS.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    }


def sanitize_companion_id(raw: str | None) -> str:
    s = (raw or "koharu").strip().lower()
    s = SAFE_COMPANION.sub("-", s).strip("-") or "koharu"
    # custom companions stay custom-...
    if len(s) > 64:
        s = s[:64]
    return s


def set_last_companion(companion_id: str | None) -> str:
    global _last_companion_id
    cid = sanitize_companion_id(companion_id)
    with _last_companion_lock:
        _last_companion_id = cid
    return cid


def get_last_companion() -> str:
    with _last_companion_lock:
        return _last_companion_id


def companion_generated_dir(companion_id: str) -> Path:
    d = MEDIA_ROOT / sanitize_companion_id(companion_id) / "generated"
    d.mkdir(parents=True, exist_ok=True)
    # also ensure library/videos exist for media CDN layout
    (MEDIA_ROOT / sanitize_companion_id(companion_id) / "library").mkdir(
        parents=True, exist_ok=True
    )
    (MEDIA_ROOT / sanitize_companion_id(companion_id) / "videos").mkdir(
        parents=True, exist_ok=True
    )
    return d


def media_public_url(companion_id: str, file_name: str) -> str:
    cid = sanitize_companion_id(companion_id)
    return f"{MEDIA_PUBLIC_BASE}/{cid}/generated/{file_name}"


def mark_ingested(src: Path, size: int | None = None) -> None:
    try:
        key = str(src.resolve()) if src.exists() else str(src)
    except Exception:
        key = str(src)
    with _ingested_lock:
        _ingested_sources.add(key)
        if size is None:
            try:
                size = src.stat().st_size if src.exists() else None
            except Exception:
                size = None
        if size and size > 0:
            _ingested_sizes.add(int(size))


def already_ingested(src: Path) -> bool:
    """True if this exact source path was already handled (watcher dedupe)."""
    try:
        key = str(src.resolve())
    except Exception:
        key = str(src)
    with _ingested_lock:
        return key in _ingested_sources


def media_has_same_size(size: int, companion_id: str | None = None) -> Path | None:
    """If we already saved a file with this exact size, return it (dedupe)."""
    if size < 50_000:
        return None
    roots: list[Path] = []
    if companion_id:
        roots.append(companion_generated_dir(companion_id))
    else:
        if MEDIA_ROOT.exists():
            for d in MEDIA_ROOT.iterdir():
                g = d / "generated"
                if g.is_dir():
                    roots.append(g)
    for root in roots:
        try:
            for f in root.iterdir():
                if f.is_file() and f.suffix.lower() in IMAGE_EXTS:
                    try:
                        if f.stat().st_size == size:
                            return f
                    except Exception:
                        continue
        except Exception:
            continue
    return None


def save_to_media_library(
    src: Path,
    companion_id: str | None,
    job_id: str | None = None,
    *,
    source_tag: str = "job",
) -> Path:
    """
    Copy Fooocus output onto this PC under media/{companion}/generated/
    once only (no double-copies from job + watcher).
    """
    try:
        src = Path(src)
        if not src.is_file():
            print(f"[media] skip missing source: {src}")
            return src

        # Already living under media/.../generated — keep it
        try:
            rel = src.resolve().relative_to(MEDIA_ROOT.resolve())
            parts = rel.parts
            if len(parts) >= 3 and parts[1] == "generated":
                mark_ingested(src)
                return src
        except ValueError:
            pass

        if already_ingested(src):
            print(f"[media] skip already ingested: {src.name}")
            return src

        cid = set_last_companion(companion_id)
        try:
            size_now = src.stat().st_size
        except Exception:
            size_now = 0

        # Dedupe: exact same size already in this companion folder
        existing = media_has_same_size(size_now, cid)
        if existing is not None:
            mark_ingested(src, size_now)
            mark_ingested(existing, size_now)
            print(f"[media] dedupe skip {src.name} (matches {existing.name})")
            return existing

        dest_dir = companion_generated_dir(cid)
        ext = src.suffix.lower() or ".png"
        if ext not in IMAGE_EXTS:
            ext = ".png"
        stamp = time.strftime("%Y%m%d_%H%M%S")
        short = (job_id or uuid.uuid4().hex)[:10]
        dest_name = f"fooocus-{stamp}-{short}{ext}"
        dest = dest_dir / dest_name
        n = 1
        while dest.exists():
            dest = dest_dir / f"fooocus-{stamp}-{short}-{n}{ext}"
            n += 1

        last_err: Exception | None = None
        for attempt in range(5):
            try:
                size1 = src.stat().st_size
                time.sleep(0.15)
                size2 = src.stat().st_size
                if size1 != size2 or size2 < 1024:
                    time.sleep(0.35)
                    continue
                # Re-check dedupe after stabilize
                existing2 = media_has_same_size(size2, cid)
                if existing2 is not None:
                    mark_ingested(src, size2)
                    return existing2
                shutil.copy2(src, dest)
                if dest.is_file() and dest.stat().st_size >= 1024:
                    mark_ingested(src, dest.stat().st_size)
                    mark_ingested(dest, dest.stat().st_size)
                    print(
                        f"[media] saved ({source_tag}) {src.name} -> "
                        f"{cid}/generated/{dest.name} ({dest.stat().st_size} bytes)"
                    )
                    return dest
            except Exception as e:
                last_err = e
                time.sleep(0.4)
        if last_err:
            print(f"[media] copy failed after retries: {last_err}")
            traceback.print_exc()
        try:
            shutil.copy2(src, dest)
            if dest.is_file():
                mark_ingested(src, dest.stat().st_size)
                mark_ingested(dest, dest.stat().st_size)
                print(f"[media] saved (weak) {src.name} -> {dest}")
                return dest
        except Exception:
            traceback.print_exc()
        return src
    except Exception:
        traceback.print_exc()
        return src


def _outputs_watcher_loop(poll_sec: float = 3.0) -> None:
    """
    Auto-ingest Fooocus UI gens into media/ on this PC.
    Skips files already saved by a site job (no double copies).
    Does not run while a GPU job holds _gen_lock.
    """
    print(f"[media] outputs watcher on {FOOOCUS_OUTPUTS} -> {MEDIA_ROOT}")
    known: dict[str, float] = {}
    try:
        for p in list_output_images():
            try:
                known[str(p.resolve())] = p.stat().st_mtime
                mark_ingested(p, p.stat().st_size)
            except Exception:
                pass
        # Also fingerprint existing media so we don't re-import history
        if MEDIA_ROOT.exists():
            for d in MEDIA_ROOT.iterdir():
                g = d / "generated"
                if not g.is_dir():
                    continue
                for f in g.iterdir():
                    if f.is_file() and f.suffix.lower() in IMAGE_EXTS:
                        try:
                            mark_ingested(f, f.stat().st_size)
                        except Exception:
                            pass
    except Exception:
        traceback.print_exc()

    while True:
        try:
            time.sleep(poll_sec)
            # Don't race the active site job (it saves itself)
            if not _gen_lock.acquire(blocking=False):
                continue
            try:
                if not FOOOCUS_OUTPUTS.exists():
                    continue
                for p in list_output_images():
                    try:
                        key = str(p.resolve())
                        mtime = p.stat().st_mtime
                        size = p.stat().st_size
                    except Exception:
                        continue
                    prev = known.get(key)
                    if prev is not None and prev == mtime:
                        continue
                    known[key] = mtime
                    if size < 2048:
                        continue
                    if already_ingested(p):
                        continue
                    # Prefer last site companion for attribution
                    cid = get_last_companion() or "_inbox"
                    save_to_media_library(p, cid, job_id=None, source_tag="watcher")
            finally:
                _gen_lock.release()
        except Exception:
            traceback.print_exc()
            time.sleep(3.0)


def normalize_aspect(aspect: str | None, fallback: str) -> str:
    if not aspect:
        return fallback
    if "×" in aspect or "<span" in aspect:
        return aspect
    return fallback


class GenBody(BaseModel):
    prompt: str = ""
    negative_prompt: str = ""
    style_selections: list[str] = Field(
        default_factory=lambda: [
            "Fooocus V2",
            "Fooocus Enhance",
            "Fooocus Sharp",
            "Fooocus Photograph",
        ]
    )
    performance_selection: str = "Speed"
    aspect_ratios_selection: str | None = None
    image_number: int = 1
    image_seed: int | str = -1
    sharpness: float = 2.0
    guidance_scale: float = 4.0
    base_model_name: str | None = None
    require_base64: bool = True
    async_process: bool = False
    # Companion folder under media/{id}/generated/ (accept JS camelCase too)
    companion_id: str | None = None
    companionId: str | None = None


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    # CORS preflight must never require auth (Safari / mobile is strict)
    if request.method == "OPTIONS":
        return await call_next(request)
    # Public: health + finished job images (unguessable job id + token)
    if path in ("/health", "/", "/docs", "/openapi.json"):
        return await call_next(request)
    if path.startswith("/v1/jobs/") and path.endswith("/image"):
        return await call_next(request)
    if BRIDGE_SECRET:
        secret = request.headers.get("x-bridge-secret") or request.query_params.get(
            "secret"
        )
        if secret != BRIDGE_SECRET:
            from fastapi.responses import JSONResponse

            # Include CORS so mobile browsers surface the real error
            return JSONResponse(
                {"error": "Unauthorized"},
                status_code=401,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                },
            )
    return await call_next(request)


@app.get("/health")
@app.get("/")
def health():
    """
    Bridge liveness: ok=true means THIS process is healthy.
    Do NOT set ok=false just because Fooocus is busy/slow — keepalives
    used to kill the bridge mid-generation when Fooocus timed out.
    """
    try:
        ui_ok = False
        try:
            import urllib.request

            urllib.request.urlopen(FOOOCUS_URL, timeout=1.5)
            ui_ok = True
        except Exception:
            ui_ok = False

        running = 0
        queued = 0
        with _jobs_lock:
            for j in _jobs.values():
                st = j.get("status")
                if st == "running":
                    running += 1
                elif st == "queued":
                    queued += 1

        koharu_ok = _koharu_api_up()
        return {
            "ok": True,
            "fooocus_ok": ui_ok,
            "fooocus_url": FOOOCUS_URL,
            "koharu_api_ok": koharu_ok,
            "koharu_api_url": KOHARU_API_BASE,
            "outputs": str(FOOOCUS_OUTPUTS),
            "media_root": str(MEDIA_ROOT),
            "media_public_base": MEDIA_PUBLIC_BASE,
            "auto_save": True,
            "auto_save_path": str(MEDIA_ROOT / "{companion}" / "generated"),
            "bridge": "koharu-fooocus-bridge",
            "auth": bool(BRIDGE_SECRET),
            "jobs": len(_jobs),
            "jobs_running": running,
            "jobs_queued": queued,
            "hint": (
                None
                if koharu_ok
                else "Restart Fooocus (run_koharu_lust.bat) so :7867 gen API starts. UI alone is not enough."
            ),
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "fooocus_url": FOOOCUS_URL}


# In-process helper that Fooocus starts from webui.py (koharu_api.py)
KOHARU_API_BASE = os.environ.get("KOHARU_FOOOCUS_API_BASE", "http://127.0.0.1:7867").rstrip(
    "/"
)


def _koharu_api_up(timeout: float = 1.5) -> bool:
    import urllib.request

    try:
        with urllib.request.urlopen(
            f"{KOHARU_API_BASE}/health", timeout=timeout
        ) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return bool(data.get("ok"))
    except Exception:
        return False


def _wait_koharu_api(max_wait: float = 45.0) -> bool:
    """Fooocus UI can be up before koharu_api binds :7867 — wait briefly."""
    t0 = time.time()
    while time.time() - t0 < max_wait:
        if _koharu_api_up():
            return True
        time.sleep(1.0)
    return _koharu_api_up()


def _generate_via_koharu_api(body: GenBody) -> list[Path]:
    """
    Call in-process Fooocus helper (koharu_api.py on :7867).
    This is the ONLY reliable gen path (Gradio cannot serialize AsyncTask).
    """
    import urllib.error
    import urllib.request

    if not _koharu_api_up():
        # Short wait — user may have just restarted Fooocus
        if not _wait_koharu_api(20.0):
            raise RuntimeError(
                "Fooocus gen helper :7867 is down. "
                "Fully restart Fooocus (close all Fooocus windows, then run_koharu_lust.bat). "
                "You should see: [Koharu] Fooocus API helper started on :7867"
            )

    try:
        n_img = int(body.image_number) if body.image_number is not None else 1
    except (TypeError, ValueError):
        n_img = 1
    payload = {
        "prompt": body.prompt,
        "negative_prompt": body.negative_prompt,
        "performance": body.performance_selection or "Speed",
        "performance_selection": body.performance_selection or "Speed",
        "aspect_ratios_selection": body.aspect_ratios_selection,
        "image_number": max(1, min(n_img, 4)),
        "seed": body.image_seed,
        "image_seed": body.image_seed,
        "sharpness": body.sharpness,
        "guidance_scale": body.guidance_scale,
        "base_model_name": body.base_model_name,
        "style_selections": body.style_selections,
        "timeout": 300,
    }
    api_url = f"{KOHARU_API_BASE}/v1/generate"
    req = urllib.request.Request(
        api_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=320) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"koharu api HTTP {e.code}: {detail}") from e
    except Exception as e:
        raise RuntimeError(f"koharu api request failed: {e}") from e

    if not data.get("ok"):
        raise RuntimeError(data.get("error") or "koharu api generate failed")
    files = data.get("files") or ([data["file"]] if data.get("file") else [])
    out: list[Path] = []
    for f in files:
        p = Path(str(f))
        if p.is_file():
            out.append(p)
    if not out:
        raise RuntimeError("koharu api returned no files on disk")
    return out


def run_generate(body: GenBody) -> dict:
    with _gen_lock:
        try:
            n_img = int(body.image_number) if body.image_number is not None else 1
        except (TypeError, ValueError):
            n_img = 1
        n_img = max(1, min(n_img, 4))

        before = list_output_images()
        picks: list[Path] = []

        # ONLY path: Koharu in-process API (:7867). Gradio fallback removed — it
        # accepted jobs but never produced images (AsyncTask not serializable).
        try:
            picks = _generate_via_koharu_api(body)
            print(f"[bridge] koharu-api returned {len(picks)} file(s)")
        except Exception as api_err:
            traceback.print_exc()
            return {
                "ok": False,
                "error": str(api_err),
                "koharu_api_ok": _koharu_api_up(),
                "fooocus_url": FOOOCUS_URL,
                "hint": "Restart Fooocus completely so :7867 starts, then retry.",
            }

        if not picks:
            after = list_output_images()
            new_files = sorted(after - before, key=lambda p: p.stat().st_mtime)
            picks = new_files[-n_img:] if new_files else []

        if not picks:
            return {
                "ok": False,
                "error": "Fooocus finished but no new files in outputs folder",
                "outputs_dir": str(FOOOCUS_OUTPUTS),
            }
        companion = set_last_companion(body.companion_id or body.companionId or "koharu")
        images_meta = []
        saved_paths: list[Path] = []
        for p in picks:
            # Copy first, then mark — mark-before-copy skipped save (pipeline "done" but no media file)
            saved = save_to_media_library(p, companion, job_id=None, source_tag="generate")
            try:
                mark_ingested(p, p.stat().st_size)
                mark_ingested(saved, saved.stat().st_size if saved.is_file() else None)
            except Exception:
                pass
            saved_paths.append(saved)
            cid = sanitize_companion_id(companion)
            entry = {
                "path": str(saved),
                "name": saved.name,
                "fooocus_path": str(p),
                "companion_id": cid,
                "media_rel": f"{cid}/generated/{saved.name}",
                "media_url": media_public_url(cid, saved.name),
            }
            if body.require_base64:
                raw = saved.read_bytes()
                entry["base64"] = base64.b64encode(raw).decode("ascii")
            images_meta.append(entry)

        primary = saved_paths[-1] if saved_paths else picks[-1]
        cid = sanitize_companion_id(companion)
        out = {
            "ok": True,
            "images": images_meta,
            "result": images_meta,
            "file_path": str(primary),
            "file_name": primary.name,
            "companion_id": cid,
            "media_root": str(MEDIA_ROOT),
            "media_rel": f"{cid}/generated/{primary.name}",
            "media_url": media_public_url(cid, primary.name),
        }
        if body.require_base64 and images_meta:
            out["base64"] = images_meta[-1].get("base64")
        return out


def _job_worker(job_id: str, body: GenBody):
    """Never let job errors kill the uvicorn process."""
    try:
        with _jobs_lock:
            _jobs[job_id]["status"] = "running"
        # Prefer file path over base64 — keeps RAM low (fixes Next/site crashes)
        body.require_base64 = False
        companion = set_last_companion(body.companion_id or body.companionId or "koharu")
        try:
            result = run_generate(body)
            # Files are already saved under media/ in run_generate — only
            # re-copy if path is still outside MEDIA_ROOT (failed save).
            if result.get("ok") and result.get("file_path"):
                src = Path(str(result["file_path"]))
                try:
                    src.resolve().relative_to(MEDIA_ROOT.resolve())
                    saved = src
                except ValueError:
                    saved = save_to_media_library(
                        src, companion, job_id=job_id, source_tag="job"
                    )
                cid = sanitize_companion_id(companion)
                result["file_path"] = str(saved)
                result["file_name"] = saved.name
                result["companion_id"] = cid
                result["media_rel"] = f"{cid}/generated/{saved.name}"
                result["media_url"] = media_public_url(cid, saved.name)
            if result.get("ok") and result.get("images"):
                fixed = []
                for img in result["images"]:
                    p = Path(str(img.get("path") or ""))
                    cid = sanitize_companion_id(companion)
                    if p.is_file():
                        try:
                            p.resolve().relative_to(MEDIA_ROOT.resolve())
                            s = p
                        except ValueError:
                            s = save_to_media_library(
                                p, companion, job_id=job_id, source_tag="job-img"
                            )
                        fixed.append(
                            {
                                "path": str(s),
                                "name": s.name,
                                "media_rel": f"{cid}/generated/{s.name}",
                                "media_url": media_public_url(cid, s.name),
                                "companion_id": cid,
                            }
                        )
                    else:
                        fixed.append(img)
                result["images"] = fixed
        except Exception as gen_err:
            traceback.print_exc()
            result = {"ok": False, "error": str(gen_err)}
        with _jobs_lock:
            if result.get("ok"):
                _jobs[job_id].update(
                    {
                        "status": "done",
                        "file_path": result.get("file_path"),
                        "file_name": result.get("file_name"),
                        "media_rel": result.get("media_rel"),
                        "media_url": result.get("media_url"),
                        "companion_id": result.get("companion_id"),
                        "images": [
                            {
                                "path": i.get("path"),
                                "name": i.get("name"),
                                "media_rel": i.get("media_rel"),
                                "media_url": i.get("media_url"),
                            }
                            for i in (result.get("images") or [])
                        ],
                        "finished_at": time.time(),
                    }
                )
            else:
                _jobs[job_id].update(
                    {
                        "status": "error",
                        "error": result.get("error") or "generate failed",
                        "finished_at": time.time(),
                    }
                )
    except Exception as e:
        traceback.print_exc()
        try:
            with _jobs_lock:
                if job_id in _jobs:
                    _jobs[job_id].update(
                        {
                            "status": "error",
                            "error": str(e),
                            "finished_at": time.time(),
                        }
                    )
        except Exception:
            pass


@app.post("/v1/jobs")
def start_job(body: GenBody):
    job_id = uuid.uuid4().hex
    token = uuid.uuid4().hex
    with _jobs_lock:
        _jobs[job_id] = {
            "id": job_id,
            "token": token,
            "status": "queued",
            "created_at": time.time(),
            "prompt": body.prompt[:200],
        }
    t = threading.Thread(target=_job_worker, args=(job_id, body), daemon=True)
    t.start()
    return {"ok": True, "id": job_id, "token": token, "status": "queued"}


@app.get("/v1/jobs/{job_id}")
def get_job(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # Lightweight poll — never ship multi-MB base64 through the app server
    out = {
        "ok": True,
        "id": job_id,
        "status": job["status"],
        "error": job.get("error"),
        "token": job.get("token"),
    }
    if job["status"] == "done":
        tok = job.get("token") or ""
        # Keep job image endpoint as backup; prefer media_url on clients
        out["image_url"] = f"/v1/jobs/{job_id}/image?t={tok}"
        out["file_name"] = job.get("file_name")
        out["media_rel"] = job.get("media_rel")
        # Absolute CDN URL when available (phones load this directly)
        out["media_url"] = job.get("media_url")
        out["companion_id"] = job.get("companion_id")
        # Also absolute-ize image_url if client forgets to prefix
        if out.get("media_url"):
            out["image_url"] = out["media_url"]
    return out


@app.get("/v1/jobs/{job_id}/image")
def get_job_image(job_id: str, t: str = ""):
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("token") and t != job.get("token"):
        raise HTTPException(status_code=401, detail="Invalid image token")
    if job.get("status") != "done":
        raise HTTPException(status_code=409, detail="Image not ready")
    path = job.get("file_path")
    if not path or not Path(path).is_file():
        raise HTTPException(status_code=404, detail="Image file missing")
    media = "image/png"
    if str(path).lower().endswith((".jpg", ".jpeg")):
        media = "image/jpeg"
    elif str(path).lower().endswith(".webp"):
        media = "image/webp"
    return FileResponse(
        path,
        media_type=media,
        filename=job.get("file_name") or Path(path).name,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.post("/v1/generation/text-to-image")
@app.post("/v1/generation/text-to-image-simple")
@app.post("/v2/generation/text-to-image-with-ip")
def text_to_image(body: GenBody):
    try:
        return run_generate(body)
    except Exception as e:
        traceback.print_exc()
        return {"ok": False, "error": str(e)}


def main():
    global FOOOCUS_URL, FOOOCUS_OUTPUTS, MEDIA_ROOT, _client, BRIDGE_SECRET, MEDIA_PUBLIC_BASE
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8888)
    parser.add_argument("--fooocus", default=None)
    parser.add_argument("--outputs", default=None)
    parser.add_argument("--media-root", default=None)
    parser.add_argument("--media-public-base", default=None)
    parser.add_argument("--secret", default=None)
    parser.add_argument(
        "--no-watcher",
        action="store_true",
        help="Disable auto-copy of Fooocus outputs into media/",
    )
    args = parser.parse_args()
    if args.fooocus:
        FOOOCUS_URL = args.fooocus
        _client = None
    if args.outputs:
        FOOOCUS_OUTPUTS = Path(args.outputs)
    if args.media_root:
        MEDIA_ROOT = Path(args.media_root).resolve()
    if args.media_public_base:
        MEDIA_PUBLIC_BASE = args.media_public_base.rstrip("/")
    if args.secret:
        BRIDGE_SECRET = args.secret
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    companion_generated_dir("koharu")
    companion_generated_dir("_inbox")
    print(f"Koharu Fooocus bridge -> {FOOOCUS_URL}")
    print(f"Outputs folder -> {FOOOCUS_OUTPUTS}")
    print(f"Media library  -> {MEDIA_ROOT}/{{companion}}/generated/  (AUTO-SAVE ON)")
    print(f"Media public   -> {MEDIA_PUBLIC_BASE}/{{companion}}/generated/")
    print(f"Auth secret enabled -> {bool(BRIDGE_SECRET)}")
    print(f"Listening on http://{args.host}:{args.port}")
    if not args.no_watcher:
        t = threading.Thread(
            target=_outputs_watcher_loop, kwargs={"poll_sec": 2.0}, daemon=True
        )
        t.start()
        print("Outputs watcher  -> ON (every new Fooocus file → media/ on this PC)")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
