@echo off
setlocal
cd /d "%~dp0..\external\openwa"
set REDIS_ENABLED=true
set REDIS_BUILTIN=false
set REDIS_HOST=127.0.0.1
set REDIS_PORT=6379
set QUEUE_ENABLED=true
set CACHE_ENABLED=true
node dist\main.js
