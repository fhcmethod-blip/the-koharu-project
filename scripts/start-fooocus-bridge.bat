@echo off
title Koharu Fooocus Bridge (public-ready)
cd /d "%~dp0"
set FOOOCUS_URL=http://127.0.0.1:7865
set FOOOCUS_OUTPUTS=D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\Fooocus\outputs
set SECRET=
if exist "%~dp0..\.env.local" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0..\.env.local") do (
    if /I "%%A"=="FOOOCUS_BRIDGE_SECRET" set SECRET=%%B
  )
)
set PY=D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\python_embeded\python.exe
echo Fooocus UI :7865 + Bridge :8888
if not "%SECRET%"=="" (
  "%PY%" fooocus_bridge.py --host 127.0.0.1 --port 8888 --fooocus http://127.0.0.1:7865 --outputs "%FOOOCUS_OUTPUTS%" --secret %SECRET%
) else (
  "%PY%" fooocus_bridge.py --host 127.0.0.1 --port 8888 --fooocus http://127.0.0.1:7865 --outputs "%FOOOCUS_OUTPUTS%"
)
pause
