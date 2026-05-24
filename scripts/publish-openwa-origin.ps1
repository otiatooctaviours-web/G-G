$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $repoRoot "runtime"
$tunnelLogPath = Join-Path $runtimeDir "cloudflared-openwa-bridge.err.log"
$namedOriginPath = Join-Path $runtimeDir "openwa-public-origin.txt"
$projectName = "g-g"
$cloudflareToken = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "User")

if (-not $cloudflareToken) {
  throw "CLOUDFLARE_API_TOKEN is not configured."
}

function Get-TunnelUrl {
  if (Test-Path $namedOriginPath) {
    $namedOrigin = (Get-Content $namedOriginPath -Raw).Trim()
    if ($namedOrigin) {
      return $namedOrigin
    }
  }

  $explicitOrigin = [Environment]::GetEnvironmentVariable("OPENWA_PUBLIC_BASE_URL", "User")
  if (-not $explicitOrigin) {
    $explicitOrigin = [Environment]::GetEnvironmentVariable("OPENWA_PUBLIC_BASE_URL", "Process")
  }
  if ($explicitOrigin) {
    return $explicitOrigin.Trim()
  }

  $deadline = (Get-Date).AddMinutes(3)
  $pattern = "https://[a-z0-9-]+\.trycloudflare\.com"

  while ((Get-Date) -lt $deadline) {
    if (Test-Path $tunnelLogPath) {
      $match = Select-String -Path $tunnelLogPath -Pattern $pattern | Select-Object -Last 1
      if ($match) {
        return $match.Matches[0].Value
      }
    }

    Start-Sleep -Seconds 5
  }

  return ""
}

$tunnelUrl = Get-TunnelUrl

if (-not $tunnelUrl) {
  throw "Could not determine the current quick tunnel URL."
}

$env:CLOUDFLARE_API_TOKEN = $cloudflareToken
$tunnelUrl | wrangler pages secret put OPENWA_BASE_URL --project-name $projectName
wrangler pages deploy .pages-deploy-temp --project-name $projectName --branch main --commit-dirty true --commit-message "Auto-refresh OpenWA bridge origin"

Write-Output ("Published OPENWA_BASE_URL={0}" -f $tunnelUrl)
