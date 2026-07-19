@echo off
REM Force kill + restart bridge
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name='python.exe' OR Name='pythonw.exe'\" -EA SilentlyContinue |" ^
  "  Where-Object { $_.CommandLine -and ($_.CommandLine -match 'fooocus_bridge\\.py') } |" ^
  "  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue };" ^
  "Start-Sleep -Seconds 1"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ensure-fooocus-bridge.ps1"
timeout /t 2 /nobreak >nul
curl -s http://127.0.0.1:8888/health
echo.
