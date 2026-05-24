$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$startupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$startupFile = Join-Path $startupDir "GGMarketing-OpenWA-Startup.cmd"
$bootstrapScript = Join-Path $repoRoot "scripts\start-openwa-on-login.ps1"

if (-not (Test-Path $startupDir)) {
  New-Item -ItemType Directory -Path $startupDir | Out-Null
}

$content = @(
  "@echo off",
  "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$bootstrapScript`""
) -join "`r`n"

Set-Content -Path $startupFile -Value $content -Encoding ASCII
Write-Output "Installed startup launcher at $startupFile"
