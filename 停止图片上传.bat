@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在收尾：看门狗 + 上传服务 + 专用 Chrome...

rem 新版 Windows 已移除 wmic，改用 CIM 按命令行找到进程
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*upload-watchdog.mjs*' -or $_.CommandLine -like '*upload-server.mjs*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":9344" ^| findstr LISTENING') do (
  taskkill /pid %%p /f >nul 2>&1
)

timeout /t 1 >nul
echo 已全部收尾。
pause
