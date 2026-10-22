@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在停止：看门狗 + 上传服务 + 专用 Chrome...

for /f "tokens=2" %%p in ('wmic process where "name='node.exe' and (commandline like '%%upload-watchdog%%' or commandline like '%%upload-server%%')" get processid /value 2^>nul ^| find "="') do (
  taskkill /pid %%p /f >nul 2>&1
)

for /f "tokens=5" %%p in ('netstat -ano | findstr ":9344" ^| findstr LISTENING') do (
  taskkill /pid %%p /f >nul 2>&1
)

timeout /t 1 >nul
echo 已全部停止。
pause
