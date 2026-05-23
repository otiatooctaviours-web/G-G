$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $repoRoot "runtime"
$tunnelLogPath = Join-Path $runtimeDir "cloudflared-openwa-bridge.err.log"
$publicHostname = [Environment]::GetEnvironmentVariable("OPENWA_PUBLIC_HOSTNAME", "User")
$zoneId = [Environment]::GetEnvironmentVariable("OPENWA_CF_ZONE_ID", "User")
$zoneName = [Environment]::GetEnvironmentVariable("OPENWA_CF_ZONE_NAME", "User")
$recordId = [Environment]::GetEnvironmentVariable("OPENWA_CF_DNS_RECORD_ID", "User")
$cloudflareToken = [Environment]::GetEnvironmentVariable("CLOUDFLARE_API_TOKEN", "User")
$dnsProxiedSetting = [Environment]::GetEnvironmentVariable("OPENWA_DNS_PROXIED", "User")

if (-not $dnsProxiedSetting) {
  $dnsProxiedSetting = "false"
}

$dnsProxied = $dnsProxiedSetting.ToLowerInvariant() -eq "true"

if (-not $publicHostname -or -not $zoneId -or -not $zoneName -or -not $cloudflareToken) {
  throw "Cloudflare DNS sync configuration is incomplete."
}

function Invoke-CloudflareApi {
  param(
    [string] $Method,
    [string] $Uri,
    [object] $Body = $null
  )

  $headers = @{
    Authorization = "Bearer $cloudflareToken"
  }

  if ($Body -ne $null) {
    $headers["Content-Type"] = "application/json"
  }

  $requestBody = $null
  if ($Body -ne $null) {
    $requestBody = $Body | ConvertTo-Json -Depth 10 -Compress
  }

  $response = Invoke-WebRequest -Method $Method -Uri $Uri -Headers $headers -Body $requestBody -UseBasicParsing
  $payload = $response.Content | ConvertFrom-Json

  if (-not $payload.success) {
    $errorMessage = ($payload.errors | ForEach-Object { $_.message }) -join "; "
    throw "Cloudflare API failed: $errorMessage"
  }

  return $payload.result
}

function Get-TunnelUrl {
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
  throw "Could not find a quick tunnel URL in $tunnelLogPath"
}

$targetHost = ([Uri] $tunnelUrl).Host
$payload = @{
  type = "CNAME"
  name = $publicHostname
  content = $targetHost
  proxied = $dnsProxied
  ttl = 1
}

if ($recordId) {
  $updateUri = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$recordId"
  Invoke-CloudflareApi -Method PUT -Uri $updateUri -Body $payload | Out-Null
} else {
  $recordQuery = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records?type=CNAME&name=$publicHostname"
  $existingRecords = Invoke-CloudflareApi -Method GET -Uri $recordQuery

  if ($existingRecords.Count -gt 0) {
    $record = $existingRecords[0]
    if ($record.content -ne $targetHost -or [bool] $record.proxied -ne $dnsProxied) {
      $updateUri = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records/$($record.id)"
      Invoke-CloudflareApi -Method PUT -Uri $updateUri -Body $payload | Out-Null
    }
  } else {
    $createUri = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records"
    Invoke-CloudflareApi -Method POST -Uri $createUri -Body $payload | Out-Null
  }
}

Write-Output ("Synced {0} to {1}" -f $publicHostname, $targetHost)
