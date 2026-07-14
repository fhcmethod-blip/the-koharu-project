#!/usr/bin/env python3
"""
Fooocus bridge for The Koharu Project.

Connects to the running Fooocus Gradio UI (default http://127.0.0.1:7865)
and exposes REST on :8888 for the Next.js site.

  GET  /health
  POST /v1/generation/text-to-image
"""

from __future__ import annotations

import argparse
import base64
import copy
import json
import os
import time
import traceback
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

FOOOCUS_URL = os.environ.get("FOOOCUS_URL", "http://127.0.0.1:7865")
FOOOCUS_OUTPUTS = Path(
    os.environ.get(
        "FOOOCUS_OUTPUTS",
        r"D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\Fooocus\outputs",
    )
)
DEFAULTS_PATH = Path(__file__).with_name("fooocus_fn67_defaults.json")
FN_GET_TASK = 67
FN_GENERATE = 68

app = FastAPI(title="Koharu Fooocus Bridge", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_client = None
_defaults: list[Any] | None = None


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
    a = aspect.replace(" ", "").replace("x", "*").replace("X", "*")
    if "*" in a:
        w, h = a.split("*", 1)
        prefix = f"{w}×{h}"
        if fallback.startswith(prefix):
            return fallback
        return fallback  # keep exact Fooocus radio option
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


@app.get("/health")
@app.get("/")
def health():
    try:
        get_client()
        return {
            "ok": True,
            "fooocus_url": FOOOCUS_URL,
            "outputs": str(FOOOCUS_OUTPUTS),
            "bridge": "koharu-fooocus-bridge",
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "fooocus_url": FOOOCUS_URL}


def run_generate(body: GenBody) -> dict:
    data = load_defaults()
    # Gradio dep 67 includes a leading State that the client API omits
    data[1] = False  # image grid
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

    args = data[1:]  # drop State for Gradio client
    client = get_client()

    before = list_output_images()
    client.predict(*args, fn_index=FN_GET_TASK)

    job = client.submit(fn_index=FN_GENERATE)
    t0 = time.time()
    while not job.done():
        time.sleep(0.5)
        if time.time() - t0 > 300:
            return {"ok": False, "error": "Fooocus generate timed out (300s)"}

    # Gradio client often fails deserializing galleries; read files Fooocus wrote
    time.sleep(0.8)
    after = list_output_images()
    new_files = sorted(after - before, key=lambda p: p.stat().st_mtime)
    if not new_files:
        # wait a bit more in case of delayed flush
        time.sleep(2.0)
        after = list_output_images()
        new_files = sorted(after - before, key=lambda p: p.stat().st_mtime)

    if not new_files:
        return {
            "ok": False,
            "error": "Fooocus finished but no new files in outputs folder",
            "outputs_dir": str(FOOOCUS_OUTPUTS),
        }

    # Prefer the newest N images for image_number
    picks = new_files[-max(1, data[7]) :]
    images_meta = []
    for p in picks:
        raw = p.read_bytes()
        b64 = base64.b64encode(raw).decode("ascii")
        images_meta.append(
            {
                "base64": b64,
                "path": str(p),
                "name": p.name,
            }
        )

    return {
        "ok": True,
        "images": images_meta,
        "result": images_meta,
        "base64": images_meta[-1]["base64"],
    }


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
    global FOOOCUS_URL, FOOOCUS_OUTPUTS, _client
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8888)
    parser.add_argument("--fooocus", default=None)
    parser.add_argument("--outputs", default=None)
    args = parser.parse_args()
    if args.fooocus:
        FOOOCUS_URL = args.fooocus
        _client = None
    if args.outputs:
        FOOOCUS_OUTPUTS = Path(args.outputs)
    print(f"Koharu Fooocus bridge -> {FOOOCUS_URL}")
    print(f"Outputs folder -> {FOOOCUS_OUTPUTS}")
    print(f"Listening on http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
