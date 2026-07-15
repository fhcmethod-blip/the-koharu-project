# Install / repair scheduled tasks so the site + Fooocus + bridge start and recover.
# - At logon (staggered)
# - Every 5 minutes (watchdog)
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
    [int]$LogonDelaySec = 30
  )

  Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue

  if ([string]::IsNullOrWhiteSpace($Arguments)) {
    $action = New-ScheduledTaskAction -Execute $Execute -WorkingDirectory $WorkDir
  } else {
    $action = New-ScheduledTaskAction -Execute $Execute -Argument $Arguments -WorkingDirectory $WorkDir
  }

  $tLogon = New-ScheduledTaskTrigger -AtLogOn -User $UserId
  $tLogon.Delay = "PT${LogonDelaySec}S"

  $tRepeat = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 5) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
    -MultipleInstances IgnoreNew

  $principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask -TaskName $Name -Action $action -Trigger @($tLogon, $tRepeat) `
    -Settings $settings -Principal $principal -Force | Out-Null

  Write-Host "Registered task: $Name (logon +${LogonDelaySec}s, every 5 min)"
}

# 1) Fooocus GPU UI (:7865) — first so bridge can connect
$fooBat = Join-Path $ProjectDir "scripts\start-fooocus.bat"
Register-KoharuTask -Name "KoharuFooocus" `
  -Execute $fooBat `
  -WorkDir (Join-Path $ProjectDir "scripts") `
  -LogonDelaySec 15

# 2) Website (Next.js on :8000) — optional local fallback
Register-KoharuTask -Name "KoharuWebApp" `
  -Execute "wscript.exe" `
  -Arguments "`"$ProjectDir\start-site-hidden.vbs`"" `
  -WorkDir $ProjectDir `
  -LogonDelaySec 40

# 3) Fooocus bridge (:8888) — after Fooocus has time to boot
$bridgeBat = Join-Path $ProjectDir "scripts\start-fooocus-bridge.bat"
Register-KoharuTask -Name "KoharuFooocusBridge" `
  -Execute $bridgeBat `
  -WorkDir (Join-Path $ProjectDir "scripts") `
  -LogonDelaySec 90

# 4) Media CDN (:8890) — multi-device vault files via tunnel
$mediaBat = Join-Path $ProjectDir "scripts\start-media-cdn.bat"
Register-KoharuTask -Name "KoharuMediaCDN" `
  -Execute $mediaBat `
  -WorkDir (Join-Path $ProjectDir "scripts") `
  -LogonDelaySec 20

Write-Host ""
Write-Host "Starting services..."
Start-ScheduledTask -TaskName "KoharuFooocus" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName "KoharuMediaCDN" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "KoharuWebApp" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "KoharuFooocusBridge" -ErrorAction SilentlyContinue
Write-Host "Done. Tasks: KoharuFooocus, KoharuMediaCDN, KoharuWebApp, KoharuFooocusBridge"
Get-ScheduledTask -TaskName "KoharuFooocus","KoharuMediaCDN","KoharuWebApp","KoharuFooocusBridge" |
  Format-Table TaskName, State -AutoSize
