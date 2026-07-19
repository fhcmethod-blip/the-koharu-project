@echo off
REM Ensure bridge via PowerShell watchdog (hidden-safe).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ensure-fooocus-bridge.ps1"
exit /b %ERRORLEVEL%
