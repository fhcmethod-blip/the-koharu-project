"""
Koharu Vault Media Server (tier-based)
Serves content from D:\koharu-server\vault organized by subscription tier.

Tier structure:
  vault/free/photos/   - Teaser/previews (all users)
  vault/free/videos/   - Teaser videos (all users)
  vault/plus/photos/   - Touch tier photos ($15/mo)
  vault/plus/videos/   - Touch tier videos (blocked from free)
  vault/vip/photos/    - Claimed tier photos ($35/mo)
  vault/vip/videos/    - Claimed tier videos (highest tier)

Access control:
  /media/free/*   -> open to everyone
  /media/plus/*   -> requires plus or vip tier
  /media/vip/*    -> requires vip tier only

Run: python vault_media_server.py
"""

import os
import sys
import json
import mimetypes
import secrets
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

VAULT_ROOT = r"D:\koharu-server\vault"
PORT = 8890

# Session tokens (simplified - production should use Redis/DB)
# Format: {token: {"email": "...", "tier": "free|plus|vip"}}
active_sessions = {}


class VaultHandler(SimpleHTTPRequestHandler):
    """HTTP handler that enforces tier-based access control."""

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # Health endpoint
        if path == "/health":
            self._json_response(200, {
                "ok": True,
                "service": "koharu-vault-media",
                "root": VAULT_ROOT,
                "tiers": ["free", "plus", "vip"],
            })
            return

        # Session validation endpoint
        if path == "/api/session":
            token = query.get("token", [None])[0]
            if token and token in active_sessions:
                session = active_sessions[token]
                self._json_response(200, {"valid": True, **session})
            else:
                self._json_response(401, {"valid": False, "error": "Invalid session"})
            return

        # Serve media files with tier gating
        if path.startswith("/media/"):
            self._serve_media(path)
            return

        # Catalog endpoint - list files in a tier (requires auth)
        if path.startswith("/catalog/"):
            self._serve_catalog(path)
            return

        self._json_response(404, {"error": "Not found"})

    def _serve_media(self, path):
        """Serve media file with tier-based access control."""
        # Parse: /media/{tier}/{type}/{filename}
        parts = path.strip("/").split("/")
        # ['media', 'free', 'photos', 'file.jpg']

        if len(parts) < 4:
            self._json_response(400, {"error": "Invalid path. Use /media/{tier}/{type}/{filename}"})
            return

        tier = parts[1]       # free, plus, vip
        media_type = parts[2] # photos, videos
        filename = parts[3]

        # Validate tier
        if tier not in ("free", "plus", "vip"):
            self._json_response(404, {"error": f"Unknown tier: {tier}"})
            return

        # Validate type
        if media_type not in ("photos", "videos"):
            self._json_response(404, {"error": f"Unknown type: {media_type}"})
            return

        # Security: no path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            self._json_response(403, {"error": "Invalid filename"})
            return

        # Tier access control
        # Free content is open; plus/vip require a valid session token
        if tier in ("plus", "vip"):
            token_header = self.headers.get("Authorization", "").replace("Bearer ", "")
            token_query = self._parse_query().get("token", [None])[0]
            token = token_header or token_query

            if not token or token not in active_sessions:
                self._json_response(401, {"error": "Authentication required for this tier"})
                return

            session = active_sessions[token]
            user_tier = session.get("tier", "free")

            # Tier hierarchy: vip > plus > free
            tier_level = {"free": 0, "plus": 1, "vip": 2}
            required_level = tier_level.get(tier, 0)
            user_level = tier_level.get(user_tier, 0)

            if user_level < required_level:
                self._json_response(403, {"error": f"Requires {tier} tier. You have {user_tier}."})
                return

        # Build file path
        file_path = os.path.join(VAULT_ROOT, tier, media_type, filename)

        if not os.path.isfile(file_path):
            self._json_response(404, {"error": "File not found"})
            return

        # Serve the file
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = "application/octet-stream"

        try:
            with open(file_path, "rb") as f:
                data = f.read()

            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", len(data))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self._json_response(500, {"error": str(e)})

    def _serve_catalog(self, path):
        """List files in a tier category. Requires auth for plus/vip."""
        parts = path.strip("/").split("/")
        # ['catalog', 'free', 'photos'] or ['catalog', 'plus', 'videos']

        if len(parts) < 3:
            self._json_response(400, {"error": "Use /catalog/{tier}/{type}"})
            return

        tier = parts[1]
        media_type = parts[2]

        if tier not in ("free", "plus", "vip"):
            self._json_response(404, {"error": f"Unknown tier: {tier}"})
            return
        if media_type not in ("photos", "videos"):
            self._json_response(404, {"error": f"Unknown type: {media_type}"})
            return

        # Tier gating for catalog too
        if tier in ("plus", "vip"):
            token_header = self.headers.get("Authorization", "").replace("Bearer ", "")
            token_query = self._parse_query().get("token", [None])[0]
            token = token_header or token_query

            if not token or token not in active_sessions:
                self._json_response(200, {"tier": tier, "type": media_type, "files": [], "locked": True})
                return

            session = active_sessions[token]
            tier_level = {"free": 0, "plus": 1, "vip": 2}
            if tier_level.get(session.get("tier", "free"), 0) < tier_level.get(tier, 0):
                self._json_response(200, {"tier": tier, "type": media_type, "files": [], "locked": True, "upgrade_required": tier})
                return

        folder = os.path.join(VAULT_ROOT, tier, media_type)
        if not os.path.isdir(folder):
            self._json_response(200, {"tier": tier, "type": media_type, "files": [], "locked": False})
            return

        files = []
        for name in sorted(os.listdir(folder)):
            if name.startswith("."):
                continue
            fpath = os.path.join(folder, name)
            stat = os.stat(fpath)
            files.append({
                "name": name,
                "url": f"/media/{tier}/{media_type}/{name}",
                "size": stat.st_size,
                "modified": stat.st_mtime,
            })

        self._json_response(200, {"tier": tier, "type": media_type, "count": len(files), "files": files, "locked": False})

    def do_POST(self):
        """Handle session registration."""
        parsed = urlparse(self.path)

        if parsed.path == "/api/session":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self._json_response(400, {"error": "Invalid JSON"})
                return

            # Create session
            token = secrets.token_urlsafe(32)
            active_sessions[token] = {
                "email": data.get("email", "unknown"),
                "tier": data.get("tier", "free"),
            }

            self._json_response(200, {"token": token, "tier": data.get("tier", "free")})
            return

        self._json_response(404, {"error": "Not found"})

    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _parse_query(self):
        return parse_qs(urlparse(self.path).query)

    def log_message(self, format, *args):
        print(f"[vault-media] {args[0]}" if args else "")


if __name__ == "__main__":
    print(f"Koharu Vault Media Server starting on port {PORT}")
    print(f"Serving from: {VAULT_ROOT}")
    print(f"Tier structure:")
    for tier in ("free", "plus", "vip"):
        for mtype in ("photos", "videos"):
            folder = os.path.join(VAULT_ROOT, tier, mtype)
            count = len([f for f in os.listdir(folder) if not f.startswith(".")] 
                       if os.path.isdir(folder) else [])
            access = "OPEN" if tier == "free" else f"Requires {tier}+"
            print(f"  /media/{tier}/{mtype}/ — {count} files — {access}")
    print()

    server = HTTPServer(("127.0.0.1", PORT), VaultHandler)
    print(f"Ready at http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()
