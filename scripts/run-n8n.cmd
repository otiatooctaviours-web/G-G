@echo off
setlocal
cd /d "%~dp0.."
if not exist runtime mkdir runtime
if not exist runtime\n8n-data mkdir runtime\n8n-data

set "N8N_PORT=5678"
set "N8N_HOST=127.0.0.1"
set "N8N_PROTOCOL=http"
set "N8N_SECURE_COOKIE=false"
set "N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false"
set "N8N_USER_FOLDER=%cd%\runtime\n8n-data"
set "DB_SQLITE_POOL_SIZE=1"

if exist "%APPDATA%\npm\n8n.cmd" (
  call "%APPDATA%\npm\n8n.cmd" 1>>runtime\n8n.out.log 2>>runtime\n8n.err.log
  exit /b %errorlevel%
)

npx --yes n8n 1>>runtime\n8n.out.log 2>>runtime\n8n.err.log
