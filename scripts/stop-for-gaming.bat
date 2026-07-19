@echo off
REM Free the GPU for games — stop Fooocus + bridge (leave media CDN alone)
title Koharu — stop for gaming
echo Stopping Fooocus / image-gen so games get the GPU...

powershell -NoProfile -WindowStyle Hidden -Command ^
  "$ports = 7865,8888; foreach ($p in $ports) { Get-NetTCPConnection -LocalPort $p -State Listen -EA SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue } }; Get-CimInstance Win32_Process -Filter \"Name='python.exe' OR Name='pythonw.exe'\" -EA SilentlyContinue | Where-Object { $_.CommandLine -match 'entry_with_update|fooocus_bridge|Fooocus' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -EA SilentlyContinue }"

echo Done. GPU should be free. Play on.
timeout /t 2 /nobreak >nul
