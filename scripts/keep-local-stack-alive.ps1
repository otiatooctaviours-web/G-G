$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $repoRoot "runtime"
$bootstrapScript = Join-Path $repoRoot "scripts\start-openwa-on-login.ps1"
$supervisorLog = Join-Path $runtimeDir "local-stack-supervisor.log"
$pollSeconds = 45
$n8nPort = 5678
$openwaApiPort = 2785
$openwaDashboardPort = 2886
$openwaBridgePort = 8789

if (-not (Test-Path $runtimeDir)) {
  New-Item -ItemType Directory -Path $runtimeDir | Out-Null
}

function Write-SupervisorLog {
  param(
    [string] $Message
  )

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $supervisorLog -Value "[$timestamp] $Message"
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

function Test-StackHealthy {
  $openwaHealthy = Test-HttpReachable -Uri "http://127.0.0.1:$openwaApiPort/api/health"
  $dashboardHealthy = Test-HttpReachable -Uri "http://127.0.0.1:$openwaDashboardPort"
  $bridgeHealthy = Test-HttpReachable -Uri "http://127.0.0.1:$openwaBridgePort/send-text"
  $n8nHealthy = Test-HttpReachable -Uri "http://127.0.0.1:$n8nPort"

  return @{
    openwa = $openwaHealthy
    dashboard = $dashboardHealthy
    bridge = $bridgeHealthy
    n8n = $n8nHealthy
  }
}

Write-SupervisorLog "Local stack supervisor started."

while ($true) {
  $health = Test-StackHealthy

  if (-not $health.openwa -or -not $health.dashboard -or -not $health.bridge -or -not $health.n8n) {
    Write-SupervisorLog ("Health check failed: openwa={0} dashboard={1} bridge={2} n8n={3}. Running bootstrap." -f $health.openwa, $health.dashboard, $health.bridge, $health.n8n)

    try {
      powershell.exe -NoProfile -ExecutionPolicy Bypass -File $bootstrapScript | Out-Null
      Start-Sleep -Seconds 20
      $health = Test-StackHealthy
      Write-SupervisorLog ("Post-bootstrap status: openwa={0} dashboard={1} bridge={2} n8n={3}" -f $health.openwa, $health.dashboard, $health.bridge, $health.n8n)
    } catch {
      Write-SupervisorLog ("Bootstrap failed: {0}" -f $_.Exception.Message)
    }
  }

  Start-Sleep -Seconds $pollSeconds
}
