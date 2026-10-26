import fs from 'node:fs'
let s = fs.readFileSync('lib/preflight.mjs','utf8')
const start = s.indexOf('function killAndroidLike() {')
const end = s.indexOf('function startStack() {')
const repl = `function killAndroidLike() {
  // 停掉看门狗/服务（wmic 在新版 Windows 已移除，优先用 PowerShell）
  try {
    execSync(
      \`powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\\\"Name='node.exe'\\\\" | Where-Object { $_.CommandLine -match 'upload-watchdog|upload-server' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"\`,
      { stdio: 'ignore' }
    )
  } catch {}

  // 杀掉占用调试端口的 Chrome
  try {
    const out = execSync(\`netstat -ano | findstr ":${CDP_PORT}"\`, { encoding: 'utf8' })
    out
      .split(/\\r?\\n/)
      .filter((l) => l.includes('LISTENING'))
      .forEach((l) => {
        const pid = Number(l.trim().split(/\\s+/).pop())
        if (pid) {
          try {
            process.kill(pid)
          } catch {}
        }
      })
  } catch {}
}

`
s = s.slice(0, start) + repl + s.slice(end)
fs.writeFileSync('lib/preflight.mjs', s, 'utf8')
console.log('ok')
