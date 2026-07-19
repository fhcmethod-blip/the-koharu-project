# Ensure Koharu Fooocus bridge is healthy on :8888.
# Restarts only if the bridge process is dead / wrong.
# Does NOT restart just because Fooocus is busy mid-generation.

$ErrorActionPreference = "Continue"
$ProjectDir = "C:\Users\Rob_k\OneDrive\Desktop\kohar"
$LogDir = Join-Path $ProjectDir "logs"
$LogFile = Join-Path $LogDir "bridge-watchdog.log"
$Port = 8888
$HealthUrl = "http://127.0.0.1:$Port/health"

function Write-Log([string]$msg) {
  try {
    if (-not (Test-Path $LogDir)) {
      New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    $line = "{0:u} {1}" -f (Get-Date).ToUniversalTime(), $msg
    Add-Content -Path $LogFile -Value $line -Encoding utf8
    if ((Test-Path $LogFile) -and ((Get-Item $LogFile).Length -gt 400000)) {
      $tail = Get-Content $LogFile -Tail 200
      Set-Content $LogFile -Value $tail -Encoding utf8
    }
  } catch {}
}

function Get-BridgeSecret {
  $envFile = Join-Path $ProjectDir ".env.local"
  if (-not (Test-Path $envFile)) { return "" }
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*FOOOCUS_BRIDGE_SECRET\s*=\s*(.+)\s*$') {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return ""
}

function Stop-BridgeProcesses {
  Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='pythonw.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and ($_.CommandLine -match 'fooocus_bridge\.py') } |
    ForEach-Object {
      try {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Log ("killed pid " + $_.ProcessId + " " + $_.CommandLine.Substring(0, [Math]::Min(80, $_.CommandLine.Length)))
      } catch {}
    }
  # Free port 8888 if anything still holds it
  Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Log ("killed port holder pid " + $_.OwningProcess)
    } catch {}
  }
  Start-Sleep -Seconds 2
}

function Test-BridgeHealthy {
  try {
    $h = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 3
    if ($h.bridge -eq "koharu-fooocus-bridge" -and $h.ok -eq $true) {
      return @{ ok = $true; detail = $h }
    }
    return @{ ok = $false; detail = "unexpected health payload" }
  } catch {
    return @{ ok = $false; detail = $_.Exception.Message }
  }
}

function Start-Bridge {
  # Always prefer dedicated bridge-venv (never system Python — causes dup/broken clients)
  $py = Join-Path $ProjectDir "bridge-venv\Scripts\python.exe"
  if (-not (Test-Path $py)) {
    Write-Log "ERROR: bridge-venv missing at $py"
    return $false
  }

  $script = Join-Path $ProjectDir "scripts\fooocus_bridge.py"
  $outputs = "D:\Fooocus_win64_2-5-0\Fooocus_win64_2-5-0\Fooocus\outputs"
  $mediaRoot = Join-Path $ProjectDir "media"
  $secret = Get-BridgeSecret

  # All gens auto-save under media/{companion}/generated/ on this PC
  if (-not (Test-Path $mediaRoot)) {
    New-Item -ItemType Directory -Path $mediaRoot -Force | Out-Null
  }

  $argList = @(
    "-u", $script,
    "--host", "127.0.0.1",
    "--port", "$Port",
    "--fooocus", "http://127.0.0.1:7865",
    "--outputs", $outputs,
    "--media-root", $mediaRoot,
    "--media-public-base", "https://fooocus.thekoharuproject.com/media-cdn"
  )
  if ($secret) {
    $argList += @("--secret", $secret)
  }

  $env:PYTHONNOUSERSITE = "1"
  $env:PYTHONUNBUFFERED = "1"
  $env:KOHARU_FOOOCUS_API_BASE = "http://127.0.0.1:7867"

  try {
    Start-Process -FilePath $py -ArgumentList $argList `
      -WorkingDirectory (Join-Path $ProjectDir "scripts") `
      -WindowStyle Hidden | Out-Null
    Write-Log ("started bridge py=" + $py + " secret=" + [bool]$secret)
    return $true
  } catch {
    Write-Log ("ERROR start failed: " + $_.Exception.Message)
    return $false
  }
}

# Always kill ALL bridge copies first (system Python + venv dups cause "sending pic" with no gen)
Stop-BridgeProcesses
Start-Bridge
Start-Sleep -Seconds 3

$again = Test-BridgeHealthy
if ($again.ok) {
  $detail = $again.detail
  $apiHint = ""
  try {
    if ($detail.koharu_api_ok -eq $false) {
      $apiHint = " (Fooocus :7867 gen API down - restart Fooocus fully)"
      Write-Log "bridge OK but koharu_api_ok=false"
    }
  } catch {}
  Write-Log ("bridge OK" + $apiHint)
  exit 0
}

Write-Log ("restart FAILED: " + $again.detail)
exit 1
