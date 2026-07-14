# Run AFTER cloudflared tunnel login succeeds (cert.pem exists)
# Requires Admin for service reinstall.
# Usage: .\scripts\finish-tunnel-route.ps1

$ErrorActionPreference = "Stop"
$cf = "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe"
$tunnel = "a0b18abb-4ce3-41ef-8a64-d91e879a821c"
$config = "C:\Users\Rob_k\.cloudflared\config.yml"

if (-not (Test-Path "C:\Users\Rob_k\.cloudflared\cert.pem")) {
  throw "cert.pem missing. Run: cloudflared tunnel login   then approve in browser."
}

Write-Host "Routing DNS to tunnel $tunnel ..."
& $cf tunnel route dns --overwrite-dns $tunnel thekoharuproject.com
& $cf tunnel route dns --overwrite-dns $tunnel www.thekoharuproject.com

Write-Host "Validating ingress..."
& $cf tunnel --config $config ingress validate

Write-Host "Reinstalling Windows service with local config (not token-only)..."
& $cf service uninstall 2>$null
Start-Sleep 2
# Service install with config: cloudflared service install uses default config path ~/.cloudflared/config.yml
# On Windows LocalSystem, profile path differs — install explicit run with config via sc.exe
$bin = "`"$cf`" tunnel --config `"$config`" run"
New-Service -Name "Cloudflared" -BinaryPathName $bin -DisplayName "Cloudflared agent" -StartupType Automatic -ErrorAction SilentlyContinue | Out-Null
# If service still exists from uninstall race, use sc
sc.exe create Cloudflared binPath= $bin start= auto 2>$null
sc.exe config Cloudflared binPath= $bin start= auto
Start-Service Cloudflared -ErrorAction SilentlyContinue
Start-Sleep 3
Get-Service Cloudflared | Format-List Name, Status
Write-Host "Done. Test https://thekoharuproject.com"
