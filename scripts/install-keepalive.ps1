# Install / repair scheduled tasks so the site restarts if it dies.
# - At logon
# - Every 5 minutes while logged on (watchdog)
# Run once as the logged-in user (no admin required for current-user tasks).

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

  # Logon + recurring every 5 minutes (watchdog)
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

  # Keep running in background after start scripts exit
  $principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask -TaskName $Name -Action $action -Trigger @($tLogon, $tRepeat) `
    -Settings $settings -Principal $principal -Force | Out-Null

  Write-Host "Registered task: $Name"
}

# Website (Next.js on :8000)
Register-KoharuTask -Name "KoharuWebApp" `
  -Execute "wscript.exe" `
  -Arguments "`"$ProjectDir\start-site-hidden.vbs`"" `
  -WorkDir $ProjectDir `
  -LogonDelaySec 30

# Fooocus bridge (:8888)
$bridgeBat = Join-Path $ProjectDir "scripts\start-fooocus-bridge.bat"
if (Test-Path $bridgeBat) {
  Register-KoharuTask -Name "KoharuFooocusBridge" `
    -Execute $bridgeBat `
    -Arguments "" `
    -WorkDir (Join-Path $ProjectDir "scripts") `
    -LogonDelaySec 45
}

Write-Host ""
Write-Host "Done. Starting KoharuWebApp now..."
Start-ScheduledTask -TaskName "KoharuWebApp" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName "KoharuFooocusBridge" -ErrorAction SilentlyContinue
Write-Host "Tasks kicked. Check logs\startup.log"
