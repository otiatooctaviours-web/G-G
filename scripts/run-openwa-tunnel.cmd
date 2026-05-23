@echo off
setlocal
cd /d "%~dp0.."
if not exist runtime mkdir runtime
del /q runtime\cloudflared-openwa-bridge.out.log runtime\cloudflared-openwa-bridge.err.log 2>nul
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8789 --no-autoupdate 1>>runtime\cloudflared-openwa-bridge.out.log 2>>runtime\cloudflared-openwa-bridge.err.log
