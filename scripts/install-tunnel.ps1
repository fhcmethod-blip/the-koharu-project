# Install / replace Cloudflare Tunnel for Kohar
# Usage (PowerShell as Administrator):
#   .\scripts\install-tunnel.ps1 -Token "eyJ..."
#
# Creates/replaces the Windows Cloudflared service to point at this token.
# Public hostnames should be set in Cloudflare to: HTTP localhost:8000

param(
  [Parameter(Mandatory = $true)]
  [string]$Token
)

$ErrorActionPreference = "Stop"
$cloudflared = "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
  $cloudflared = "$env:ProgramFiles\cloudflared\cloudflared.exe"
}
if (-not (Test-Path $cloudflared)) {
  throw "cloudflared.exe not found. Install from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
}

Write-Host "Stopping existing Cloudflared service (if any)..."
& $cloudflared service uninstall 2>$null
Start-Sleep -Seconds 2
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Installing Cloudflared service with new tunnel token..."
& $cloudflared service install $Token
if ($LASTEXITCODE -ne 0) { throw "service install failed with exit $LASTEXITCODE" }

Start-Sleep -Seconds 2
Start-Service Cloudflared -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Get-Service Cloudflared | Format-List Name, Status, StartType

Write-Host ""
Write-Host "Done. In Cloudflare tunnel Public Hostname set:"
Write-Host "  thekoharuproject.com     -> http://localhost:8000  (path empty)"
Write-Host "  www.thekoharuproject.com -> http://localhost:8000  (path empty)"
Write-Host ""
Write-Host "Keep Kohar running:  npm run dev -- -p 8000"
