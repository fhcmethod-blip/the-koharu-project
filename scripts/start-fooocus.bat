@echo off
REM Start Fooocus once if needed. Never opens a second copy. No visible console for the app.
REM Used by Task Scheduler (hidden VBS) and manual start-image-gen.bat

set "FOO_DIR=D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0"
set "PY=%FOO_DIR%\python_embeded\python.exe"
set "ENTRY=%FOO_DIR%\Fooocus\entry_with_update.py"

if not exist "%PY%" (
  echo ERROR: python not found at %PY%
  exit /b 1
)
if not exist "%ENTRY%" (
  echo ERROR: entry not found at %ENTRY%
  exit /b 1
)

powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command ^
  "$fooDir = $env:FOO_DIR; if (-not $fooDir) { $fooDir = 'D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0' };" ^
  "$py = Join-Path $fooDir 'python_embeded\python.exe';" ^
  "$already = $false;" ^
  "try { if (Get-NetTCPConnection -LocalPort 7865 -State Listen -EA SilentlyContinue) { $already = $true } } catch {};" ^
  "if (-not $already) {" ^
  "  $procs = Get-CimInstance Win32_Process -Filter \"Name='python.exe' OR Name='pythonw.exe'\" -EA SilentlyContinue |" ^
  "    Where-Object { $_.CommandLine -and ($_.CommandLine -match 'entry_with_update|Fooocus\\\\launch|Fooocus\\\\entry') };" ^
  "  if ($procs) { $already = $true }" ^
  "};" ^
  "if ($already) { Write-Output 'Fooocus already running - not starting another'; exit 0 };" ^
  "Write-Output 'Starting Fooocus (hidden, single instance)...';" ^
  "Start-Process -FilePath $py -ArgumentList @('-s','Fooocus\entry_with_update.py','--preset','koharu_lust') -WorkingDirectory $fooDir -WindowStyle Hidden;" ^
  "exit 0"

exit /b 0
