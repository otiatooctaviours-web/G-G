@echo off
setlocal
cd /d "%~dp0..\external\openwa\dashboard"
node node_modules\vite\bin\vite.js preview --host 127.0.0.1 --port 2886
