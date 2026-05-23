@echo off
setlocal
cd /d "%~dp0.."
node scripts\openwa-session-watchdog.mjs 1>>runtime\openwa-watchdog.out.log 2>>runtime\openwa-watchdog.err.log
