@echo off
title Koharu Fooocus Bridge
cd /d "%~dp0"
set FOOOCUS_URL=http://127.0.0.1:7865
set FOOOCUS_OUTPUTS=D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\Fooocus\outputs
set PY=D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\python_embeded\python.exe
if not exist "%PY%" (
  echo Fooocus python not found: %PY%
  pause
  exit /b 1
)
echo.
echo Make sure Fooocus UI is running first (run.bat) on port 7865
echo Then this bridge serves REST on http://127.0.0.1:8888
echo.
"%PY%" -m pip install fastapi uvicorn starlette pydantic gradio_client -q
"%PY%" fooocus_bridge.py --host 127.0.0.1 --port 8888 --fooocus http://127.0.0.1:7865 --outputs "%FOOOCUS_OUTPUTS%"
pause
