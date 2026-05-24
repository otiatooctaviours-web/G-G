@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."
if not exist runtime mkdir runtime
del /q runtime\cloudflared-openwa-bridge.out.log runtime\cloudflared-openwa-bridge.err.log 2>nul
set "TUNNEL_CMD="

if defined OPENWA_NAMED_TUNNEL_TOKEN (
  set "TUNNEL_CMD=tunnel --no-autoupdate run --token !OPENWA_NAMED_TUNNEL_TOKEN!"
) else if exist runtime\openwa-tunnel-token.txt (
  set /p OPENWA_NAMED_TUNNEL_TOKEN=<runtime\openwa-tunnel-token.txt
  if defined OPENWA_NAMED_TUNNEL_TOKEN (
    set "TUNNEL_CMD=tunnel --no-autoupdate run --token !OPENWA_NAMED_TUNNEL_TOKEN!"
  )
)

if not defined TUNNEL_CMD (
  set "TUNNEL_CMD=tunnel --url http://127.0.0.1:8789 --no-autoupdate"
)

"C:\Program Files (x86)\cloudflared\cloudflared.exe" %TUNNEL_CMD% 1>>runtime\cloudflared-openwa-bridge.out.log 2>>runtime\cloudflared-openwa-bridge.err.log
