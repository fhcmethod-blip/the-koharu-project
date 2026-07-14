@echo off
REM Fooocus bridge for tunnel (port 8888). Safe to re-run: exits if already listening.
cd /d "%~dp0"

REM Already up?
powershell -NoProfile -Command "try { $c = Get-NetTCPConnection -LocalPort 8888 -State Listen -EA SilentlyContinue; if ($c) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL%==0 (
  echo Bridge already listening on 8888
  exit /b 0
)

set FOOOCUS_URL=http://127.0.0.1:7865
set FOOOCUS_OUTPUTS=D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\Fooocus\outputs
set SECRET=
if exist "%~dp0..\.env.local" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0..\.env.local") do (
    if /I "%%A"=="FOOOCUS_BRIDGE_SECRET" set SECRET=%%B
  )
)
set PY=D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\python_embeded\python.exe
if not exist "%PY%" set PY=python

echo Fooocus UI :7865 + Bridge :8888
if not "%SECRET%"=="" (
  start "KoharuFooocusBridge" /MIN "%PY%" fooocus_bridge.py --host 127.0.0.1 --port 8888 --fooocus http://127.0.0.1:7865 --outputs "%FOOOCUS_OUTPUTS%" --secret %SECRET%
) else (
  start "KoharuFooocusBridge" /MIN "%PY%" fooocus_bridge.py --host 127.0.0.1 --port 8888 --fooocus http://127.0.0.1:7865 --outputs "%FOOOCUS_OUTPUTS%"
)
exit /b 0
