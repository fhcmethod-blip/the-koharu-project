# Install / repair Koharu background services
# - Fooocus + bridge + media + web: start at logon (hidden, no CMD flash)
# - Silent 5-min recovery: only restarts if something died (port check is invisible)
# - Does NOT stop Fooocus - site image gen stays available
# Run once as the logged-in user.

$ErrorActionPreference = "Stop"
$ProjectDir = "C:\Users\Rob_k\OneDrive\Desktop\kohar"
$UserId = "$env:USERDOMAIN\$env:USERNAME"

function Register-KoharuTask {
  param(
    [string]$Name,
    [string]$Execute,
    [string]$Arguments = $null,
    [string]$WorkDir,
    [int]$LogonDelaySec = 30,
    [switch]$RepeatEvery5Min
  )

  Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue

  if ([string]::IsNullOrWhiteSpace($Arguments)) {
    $action = New-ScheduledTaskAction -Execute $Execute -WorkingDirectory $WorkDir
  } else {
    $action = New-ScheduledTaskAction -Execute $Execute -Argument $Arguments -WorkingDirectory $WorkDir
  }

  $tLogon = New-ScheduledTaskTrigger -AtLogOn -User $UserId
  $tLogon.Delay = "PT${LogonDelaySec}S"

  $triggers = @($tLogon)
  $modeNote = "logon +${LogonDelaySec}s only"

  if ($RepeatEvery5Min) {
    $tRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
      -RepetitionInterval (New-TimeSpan -Minutes 5) `
      -RepetitionDuration (New-TimeSpan -Days 3650)
    $triggers += $tRepeat
    $modeNote = "logon +${LogonDelaySec}s, silent every 5 min if down"
  }

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -MultipleInstances IgnoreNew

  $principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask -TaskName $Name -Action $action -Trigger $triggers `
    -Settings $settings -Principal $principal -Force | Out-Null

  Write-Host "Registered task: $Name ($modeNote)"
}

# All via wscript + .vbs = no CMD window flash

# 1) Fooocus GPU UI (:7865) - required for live site image gen
Register-KoharuTask -Name "KoharuFooocus" `
  -Execute "wscript.exe" `
  -Arguments "`"$ProjectDir\scripts\start-fooocus-hidden.vbs`"" `
  -WorkDir (Join-Path $ProjectDir "scripts") `
  -LogonDelaySec 15 `
  -RepeatEvery5Min

# 2) Media CDN (:8890)
Register-KoharuTask -Name "KoharuMediaCDN" `
  -Execute "wscript.exe" `
  -Arguments "`"$ProjectDir\scripts\start-media-cdn-hidden.vbs`"" `
  -WorkDir (Join-Path $ProjectDir "scripts") `
  -LogonDelaySec 20 `
  -RepeatEvery5Min

# 3) Website local fallback (:8000)
Register-KoharuTask -Name "KoharuWebApp" `
  -Execute "wscript.exe" `
  -Arguments "`"$ProjectDir\start-site-hidden.vbs`"" `
  -WorkDir $ProjectDir `
  -LogonDelaySec 40 `
  -RepeatEvery5Min

# 4) Fooocus bridge (:8888) - site talks to this (every 2 min health check)
Unregister-ScheduledTask -TaskName "KoharuFooocusBridge" -Confirm:$false -ErrorAction SilentlyContinue
$bridgeAction = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ProjectDir\scripts\ensure-fooocus-bridge.ps1`"" `
  -WorkingDirectory (Join-Path $ProjectDir "scripts")
$bridgeLogon = New-ScheduledTaskTrigger -AtLogOn -User $UserId
$bridgeLogon.Delay = "PT90S"
$bridgeRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes 2) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$bridgeSettings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
  -MultipleInstances IgnoreNew
$bridgePrincipal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName "KoharuFooocusBridge" `
  -Action $bridgeAction `
  -Trigger @($bridgeLogon, $bridgeRepeat) `
  -Settings $bridgeSettings `
  -Principal $bridgePrincipal `
  -Force | Out-Null
Write-Host "Registered task: KoharuFooocusBridge (logon + every 2 min health/restart)"

Write-Host ""
Write-Host "Starting services (including Fooocus for site image gen)..."
Start-ScheduledTask -TaskName "KoharuFooocus" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName "KoharuMediaCDN" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "KoharuWebApp" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "KoharuFooocusBridge" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done."
Write-Host "  - Fooocus stays up for the site (will restart if it crashes)"
Write-Host "  - Bridge checked every 2 min (ensure-fooocus-bridge.ps1)"
Write-Host "  - Logs: logs\bridge-watchdog.log"
Write-Host "  - No visible CMD windows"
Write-Host "  - Optional: scripts\stop-for-gaming.bat only if YOU choose to free the GPU"
Write-Host ""
Get-ScheduledTask -TaskName "KoharuFooocus","KoharuMediaCDN","KoharuWebApp","KoharuFooocusBridge" |
  Format-Table TaskName, State -AutoSize
