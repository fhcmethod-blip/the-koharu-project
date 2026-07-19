@echo off
REM Start Fooocus + bridge when YOU want image gen (not while gaming)
title Koharu — start image gen
echo Starting Fooocus + bridge for image generation...
echo (This uses the GPU — close games first if FPS drops.)
echo.

cd /d "%~dp0"
call "%~dp0start-fooocus.bat"
timeout /t 3 /nobreak >nul
call "%~dp0start-fooocus-bridge.bat"

echo.
echo Image gen stack starting. Site can use Fooocus when ready.
echo When done gaming / generating: run stop-for-gaming.bat
timeout /t 4 /nobreak >nul
