@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem 看门狗是否在跑（新版 Windows 已移除 wmic，这里改用 CIM 查命令行）
powershell -NoProfile -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*upload-watchdog.mjs*' }; if ($p) { exit 0 } else { exit 1 }"
if not errorlevel 1 goto waiting

echo 正在启动上传服务与专用浏览器...
start "" /min cmd /c "node upload-watchdog.mjs"

:waiting
echo 等待浏览器调试端口 9344 和上传服务 8787 就绪...
set "wait=0"
:wait
netstat -ano | findstr ":9344" | findstr LISTENING >nul
if errorlevel 1 goto next
netstat -ano | findstr ":8787" | findstr LISTENING >nul
if errorlevel 1 goto next
goto ready

:next
set /a wait+=1
if %wait% geq 20 goto failed
timeout /t 1 >nul
goto wait

:ready
rem 端口都在，但上传页可能被关掉了：让服务在专用 Chrome 里补开
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8787/api/open' -TimeoutSec 5 | Out-Null } catch {}"
echo 完成：上传页已在专用浏览器中打开（http://127.0.0.1:8787）。
timeout /t 2 >nul
exit /b 0

:failed
echo.
echo [失败] 20 秒内没等到浏览器调试端口 9344 或上传服务 8787。
echo 请查看同目录的 watchdog.log，或手动运行：node upload-watchdog.mjs
echo.
pause
exit /b 1
