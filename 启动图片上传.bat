@echo off
chcp 65001 >nul
cd /d "%~dp0"

netstat -ano | findstr ":8787" | findstr LISTENING >nul
if errorlevel 1 (
  echo 正在启动服务与浏览器...
  start "" /min cmd /c "node upload-watchdog.mjs"
  timeout /t 6 >nul
) else (
  echo 服务已在运行
)
echo 完成，浏览器已打开上传页。
