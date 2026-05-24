$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $repoRoot "runtime"
$apiRunner = Join-Path $repoRoot "scripts\\run-openwa-api.cmd"
$dashboardRunner = Join-Path $repoRoot "scripts\\run-openwa-dashboard.cmd"
$bridgeRunner = Join-Path $repoRoot "scripts\\run-openwa-bridge.cmd"
$tunnelRunner = Join-Path $repoRoot "scripts\\run-openwa-tunnel.cmd"
$watchdogRunner = Join-Path $repoRoot "scripts\\run-openwa-watchdog.cmd"
$dnsSyncScript = Join-Path $repoRoot "scripts\\sync-openwa-dns.ps1"
$publishOriginScript = Join-Path $repoRoot "scripts\\publish-openwa-origin.ps1"
$dashboardPort = 2886
$apiPort = 2785
$bridgePort = 8789
$redisServiceName = "Redis"

if (-not (Test-Path $runtimeDir)) {
  New-Item -ItemType Directory -Path $runtimeDir | Out-Null
}

function Test-HttpReachable {
  param(
    [string] $Uri
  )

  try {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 8
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    if ($_.Exception.Response) {
      $statusCode = [int] $_.Exception.Response.StatusCode
      return $statusCode -ge 200 -and $statusCode -lt 500
    }

    return $false
  }
}

function Start-Runner {
  param(
    [string] $RunnerPath
  )

  Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$RunnerPath`"" -WorkingDirectory $repoRoot -WindowStyle Minimized | Out-Null
}

function Ensure-ServiceRunning {
  param(
    [string] $ServiceName
  )

  try {
    $service = Get-Service -Name $ServiceName -ErrorAction Stop
    if ($service.Status -ne "Running") {
      Start-Service -Name $ServiceName -ErrorAction Stop
    }
  } catch {
    # Ignore missing services so the OpenWA startup flow can continue.
  }
}

function Test-CommandLineProcess {
  param(
    [string] $Needle
  )

  return [bool] (Get-CimInstance Win32_Process | Where-Object {
      $_.CommandLine -and $_.CommandLine -like "*$Needle*"
    } | Select-Object -First 1)
}

Ensure-ServiceRunning -ServiceName $redisServiceName

if (-not (Test-HttpReachable -Uri "http://127.0.0.1:$apiPort/api/health")) {
  Start-Runner -RunnerPath $apiRunner
}

if (-not (Test-HttpReachable -Uri "http://127.0.0.1:$dashboardPort")) {
  Start-Runner -RunnerPath $dashboardRunner
}

if (-not (Test-HttpReachable -Uri "http://127.0.0.1:$bridgePort/send-text")) {
  Start-Runner -RunnerPath $bridgeRunner
}

if (-not (Test-CommandLineProcess -Needle "openwa-session-watchdog.mjs")) {
  Start-Runner -RunnerPath $watchdogRunner
}

Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'cloudflared.exe' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Runner -RunnerPath $tunnelRunner
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$dnsSyncScript`"" -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$publishOriginScript`"" -WorkingDirectory $repoRoot -WindowStyle Hidden | Out-Null
