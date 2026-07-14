@echo off
REM The Koharu Project — start website (port 8000)
cd /d "C:\Users\Rob_k\OneDrive\Desktop\kohar"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-site.ps1"
if errorlevel 1 (
  echo.
  echo Start may have failed. Check logs\startup.log
  pause
)
