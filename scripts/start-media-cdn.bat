@echo off
REM Public media CDN on :8890 (Cloudflare Tunnel → media.thekoharuproject.com)
set MEDIA_ROOT=C:\Users\Rob_k\OneDrive\Desktop\kohar\media
set MEDIA_CDN_PORT=8890

powershell -NoProfile -Command "try { $c = Get-NetTCPConnection -LocalPort 8890 -State Listen -EA SilentlyContinue; if ($c) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL%==0 (
  echo Media CDN already on :8890
  exit /b 0
)

set PY=D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\python_embeded\python.exe
if not exist "%PY%" set PY=python

cd /d "%~dp0"
start "KoharuMediaCDN" /MIN "%PY%" media_cdn_server.py
exit /b 0
