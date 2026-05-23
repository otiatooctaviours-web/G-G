@echo off
setlocal
cd /d "%~dp0..\external\openwa"
node dist\main.js
