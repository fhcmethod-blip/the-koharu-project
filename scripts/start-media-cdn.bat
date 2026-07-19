@echo off
REM Media CDN :8890. Single instance, no extra console windows.

set MEDIA_ROOT=C:\Users\Rob_k\OneDrive\Desktop\kohar\media
set MEDIA_CDN_PORT=8890
cd /d "%~dp0"

powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command ^
  "try { if (Get-NetTCPConnection -LocalPort 8890 -State Listen -EA SilentlyContinue) { Write-Output 'Media CDN already on 8890'; exit 0 } } catch {};" ^
  "$running = Get-CimInstance Win32_Process -Filter \"Name='python.exe' OR Name='pythonw.exe'\" -EA SilentlyContinue |" ^
  "  Where-Object { $_.CommandLine -and ($_.CommandLine -match 'media_cdn_server\\.py') };" ^
  "if ($running) { Write-Output 'Media CDN process already running'; exit 0 };" ^
  "$py = 'D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\python_embeded\python.exe';" ^
  "if (-not (Test-Path $py)) { $py = 'python' };" ^
  "Write-Output 'Starting Media CDN (hidden)...';" ^
  "Start-Process -FilePath $py -ArgumentList @('media_cdn_server.py') -WorkingDirectory '%~dp0' -WindowStyle Hidden;" ^
  "exit 0"

exit /b 0
