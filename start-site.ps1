# The Koharu Project - start Next.js on port 8000 for Cloudflare Tunnel
# Safe to run multiple times (skips if already listening).

$ErrorActionPreference = "Continue"
$ProjectDir = "C:\Users\Rob_k\OneDrive\Desktop\kohar"
$LogDir = Join-Path $ProjectDir "logs"
$LogFile = Join-Path $LogDir "startup.log"
$Port = 8000
$HostAddr = "127.0.0.1"

$Npm = "C:\Users\Rob_k\AppData\Local\hermes\node\npm.cmd"
$Node = "C:\Users\Rob_k\AppData\Local\hermes\node\node.exe"
if (-not (Test-Path $Npm)) {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($cmd) { $Npm = $cmd.Source }
}
if (-not (Test-Path $Node)) {
  $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($cmd) { $Node = $cmd.Source }
}

function Write-Log {
  param([string]$msg)
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
  try {
    if (-not (Test-Path $LogDir)) {
      New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
  } catch {
    # ignore log errors
  }
}

function Test-PortOpen {
  param([int]$p)
  try {
    $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($null -eq $c) { return $false }
    return $true
  } catch {
    return $false
  }
}

Write-Log "=== start-site.ps1 begin ==="
Write-Log "npm=$Npm node=$Node"

if (-not (Test-Path $ProjectDir)) {
  Write-Log "ERROR: project missing $ProjectDir"
  exit 1
}

# Old blog must not steal the port
try {
  Disable-ScheduledTask -TaskName "BlogWebServer" -ErrorAction SilentlyContinue | Out-Null
} catch {
  # ignore
}

# Kill non-node squatters on 8000 (e.g. python http.server)
try {
  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  foreach ($l in @($listeners)) {
    $proc = Get-Process -Id $l.OwningProcess -ErrorAction SilentlyContinue
    if ($null -ne $proc) {
      if ($proc.ProcessName -ne "node") {
        Write-Log "Killing $($proc.ProcessName) pid=$($proc.Id) on port $Port"
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
      }
    }
  }
} catch {
  # ignore
}

if (Test-PortOpen -p $Port) {
  Write-Log "Port $Port already listening - nothing to do"
  exit 0
}

if (-not (Test-Path $Npm)) {
  Write-Log "ERROR: npm.cmd not found"
  exit 1
}

Set-Location $ProjectDir
Write-Log "Starting Next.js: npm run dev -- -p $Port -H $HostAddr"

$argList = @("run", "dev", "--", "-p", "$Port", "-H", $HostAddr)
$procInfo = Start-Process -FilePath $Npm -ArgumentList $argList -WorkingDirectory $ProjectDir -WindowStyle Hidden -PassThru
Write-Log "Launched npm pid=$($procInfo.Id)"

# Wait up to ~60s for listen
for ($i = 1; $i -le 30; $i++) {
  Start-Sleep -Seconds 2
  if (Test-PortOpen -p $Port) {
    Write-Log "SUCCESS: port $Port is listening after $($i * 2)s"
    exit 0
  }
}

Write-Log "WARNING: port $Port not listening after 60s - check logs or run start-site.bat manually"
exit 1
