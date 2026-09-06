@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NODE_EXE=C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

if exist "%NODE_EXE%" goto run
echo 未找到 Node.js，请先安装 Node.js。
pause
exit /b

:run
start "潮汐演示" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:4173'"
"%NODE_EXE%" server.mjs
pause
