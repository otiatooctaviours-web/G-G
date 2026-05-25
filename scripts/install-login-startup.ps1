$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$startupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$startupFile = Join-Path $startupDir "GGMarketing-OpenWA-Startup.cmd"
$supervisorScript = Join-Path $repoRoot "scripts\keep-local-stack-alive.ps1"

if (-not (Test-Path $startupDir)) {
  New-Item -ItemType Directory -Path $startupDir | Out-Null
}

$content = @(
  "@echo off",
  "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$supervisorScript`""
) -join "`r`n"

Set-Content -Path $startupFile -Value $content -Encoding ASCII
Write-Output "Installed startup launcher at $startupFile"
