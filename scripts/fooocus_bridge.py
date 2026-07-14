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
BRIDGE_SECRET = os.environ.get("FOOOCUS_BRIDGE_SECRET", "").strip()
DEFAULTS_PATH = Path(__file__).with_name("fooocus_fn67_defaults.json")
FN_GET_TASK = 67
FN_GENERATE = 68

app = FastAPI(title="Koharu Fooocus Bridge", version="1.3.0")
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
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    }


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
    try:
        # don't force client connect if UI down
        ui_ok = False
        try:
            import urllib.request

            urllib.request.urlopen(FOOOCUS_URL, timeout=2)
            ui_ok = True
        except Exception:
            ui_ok = False
        return {
            "ok": ui_ok,
            "fooocus_url": FOOOCUS_URL,
            "outputs": str(FOOOCUS_OUTPUTS),
            "bridge": "koharu-fooocus-bridge",
            "auth": bool(BRIDGE_SECRET),
            "jobs": len(_jobs),
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "fooocus_url": FOOOCUS_URL}


def run_generate(body: GenBody) -> dict:
    with _gen_lock:
        data = load_defaults()
        data[1] = False
        data[2] = body.prompt
        data[3] = body.negative_prompt
        data[4] = body.style_selections or data[4]
        data[5] = body.performance_selection or "Speed"
        data[6] = normalize_aspect(body.aspect_ratios_selection, data[6])
        data[7] = max(1, min(int(body.image_number or 1), 4))
        data[8] = "png"
        if body.image_seed not in (-1, "-1", None):
            data[9] = str(body.image_seed)
        else:
            data[9] = "0"
        data[11] = float(body.sharpness)
        data[12] = float(body.guidance_scale)
        if body.base_model_name:
            data[13] = body.base_model_name
        data[42] = False  # Black Out NSFW = OFF

        args = data[1:]
        client = get_client()

        before = list_output_images()
        client.predict(*args, fn_index=FN_GET_TASK)

        job = client.submit(fn_index=FN_GENERATE)
        t0 = time.time()
        while not job.done():
            time.sleep(0.5)
            if time.time() - t0 > 300:
                return {"ok": False, "error": "Fooocus generate timed out (300s)"}

        time.sleep(0.8)
        after = list_output_images()
        new_files = sorted(after - before, key=lambda p: p.stat().st_mtime)
        if not new_files:
            time.sleep(2.0)
            after = list_output_images()
            new_files = sorted(after - before, key=lambda p: p.stat().st_mtime)

        if not new_files:
            return {
                "ok": False,
                "error": "Fooocus finished but no new files in outputs folder",
                "outputs_dir": str(FOOOCUS_OUTPUTS),
            }

        picks = new_files[-max(1, data[7]) :]
        images_meta = []
        for p in picks:
            entry = {"path": str(p), "name": p.name}
            if body.require_base64:
                raw = p.read_bytes()
                entry["base64"] = base64.b64encode(raw).decode("ascii")
            images_meta.append(entry)

        out = {
            "ok": True,
            "images": images_meta,
            "result": images_meta,
            "file_path": str(picks[-1]),
            "file_name": picks[-1].name,
        }
        if body.require_base64 and images_meta:
            out["base64"] = images_meta[-1].get("base64")
        return out


def _job_worker(job_id: str, body: GenBody):
    try:
        with _jobs_lock:
            _jobs[job_id]["status"] = "running"
        # Prefer file path over base64 — keeps RAM low (fixes Next/site crashes)
        body.require_base64 = False
        result = run_generate(body)
        with _jobs_lock:
            if result.get("ok"):
                _jobs[job_id].update(
                    {
                        "status": "done",
                        "file_path": result.get("file_path"),
                        "file_name": result.get("file_name"),
                        "images": [
                            {
                                "path": i.get("path"),
                                "name": i.get("name"),
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
        with _jobs_lock:
            _jobs[job_id].update(
                {"status": "error", "error": str(e), "finished_at": time.time()}
            )


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
        out["image_url"] = f"/v1/jobs/{job_id}/image?t={tok}"
        out["file_name"] = job.get("file_name")
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
    global FOOOCUS_URL, FOOOCUS_OUTPUTS, _client, BRIDGE_SECRET
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8888)
    parser.add_argument("--fooocus", default=None)
    parser.add_argument("--outputs", default=None)
    parser.add_argument("--secret", default=None)
    args = parser.parse_args()
    if args.fooocus:
        FOOOCUS_URL = args.fooocus
        _client = None
    if args.outputs:
        FOOOCUS_OUTPUTS = Path(args.outputs)
    if args.secret:
        BRIDGE_SECRET = args.secret
    print(f"Koharu Fooocus bridge -> {FOOOCUS_URL}")
    print(f"Outputs folder -> {FOOOCUS_OUTPUTS}")
    print(f"Auth secret enabled -> {bool(BRIDGE_SECRET)}")
    print(f"Listening on http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
