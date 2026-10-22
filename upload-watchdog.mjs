// 一键入口：同时管着「图片上传服务」和「专用 Chrome」
//
// 规则：
//   - 服务挂了 -> 自动拉起
//   - 浏览器关�� -> 服务和看门狗一起退出（不留残进程）
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const PORT = Number(process.env.PORT || 8787)
const CDP_PORT = Number(process.env.YTO_CDP_PORT || 9344)
const UPLOAD_URL = `http://127.0.0.1:${PORT}/`
const PROFILE = path.join(ROOT, process.env.YTO_PROFILE || '.chrome-profile3')
const CHROME = path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')
const LOG = path.join(ROOT, 'watchdog.log')

function log(...a) {
  const line = a.join(' ')
  console.log(line)
  try {
    fs.appendFileSync(LOG, `${new Date().toLocaleString('zh-CN')} ${line}\n`)
  } catch {}
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function httpOk(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return r.ok
  } catch {
    return false
  }
}

/** 占用调试端口的进程号（就是浏览器主进程） */
function portPid(port) {
  try {
    const out = execSync(`netstat -ano | findstr ":${port}"`, { encoding: 'utf8' })
    for (const line of out.split(/\r?\n/)) {
      if (line.includes('LISTENING')) {
        const pid = Number(line.trim().split(/\s+/).pop())
        if (pid > 0) return pid
      }
    }
  } catch {}
  return null
}

function alive(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function waitPort(port, ms) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    const pid = portPid(port)
    if (pid) return pid
    await sleep(300)
  }
  return null
}

let serverStartedAt = 0

function startServer() {
  const p = spawn(process.execPath, [path.join(ROOT, 'upload-server.mjs')], {
    cwd: ROOT,
    detached: true,
    stdio: 'ignore',
  })
  p.unref()
  serverStartedAt = Date.now()
  log(`拉起上传服务 pid=${p.pid}`)
}

function killServer() {
  const pid = portPid(PORT)
  if (!pid) return
  try {
    process.kill(pid)
    log(`已停止服务 pid=${pid}`)
  } catch {}
}

let spawnedChrome = null

async function ensureChrome() {
  // 1) 端口上已经有浏览器就复用
  const existing = portPid(CDP_PORT)
  if (existing && alive(existing)) return existing

  // 2) 刚启动、端口还没绑定的 Chrome
  if (spawnedChrome && alive(spawnedChrome)) return spawnedChrome

  // 3) 启动一个新的
  fs.mkdirSync(PROFILE, { recursive: true })
  const p = spawn(
    CHROME,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--no-proxy-server',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion',
      '--window-position=0,0',
      '--window-size=1600,1000',
      UPLOAD_URL,
    ],
    { detached: true, stdio: 'ignore' }
  )
  p.unref()
  spawnedChrome = p.pid
  log(`拉起浏览器 pid=${p.pid}`)
  const bound = await waitPort(CDP_PORT, 20000)
  if (bound) {
    spawnedChrome = bound
    return bound
  }
  return spawnedChrome
}

/** 确保上传页开着 */
async function ensureTab() {
  try {
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`, { signal: AbortSignal.timeout(3000) })).json()
    const has = list.some((t) => t.type === 'page' && t.url.startsWith(`http://127.0.0.1:${PORT}`))
    if (has) return
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(UPLOAD_URL)}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(3000),
    })
    log('补开上传页')
  } catch {}
}

log(`上传服务 ${PORT} | Chrome 调试端口 ${CDP_PORT}`)

await ensureChrome()
if (!(await httpOk(`http://127.0.0.1:${PORT}/api/ping`))) startServer()

async function loop() {
  const pid = await ensureChrome()
  if (!pid || !alive(pid)) {
    log('检测到浏览器已关闭，服务一并退出')
    killServer()
    process.exit(0)
  }

  // 刚拉起时给服务一点时间绑定端口，否则会重复启动
  if (Date.now() - serverStartedAt > 5000 && !(await httpOk(`http://127.0.0.1:${PORT}/api/ping`))) {
    log('服务不可用，重新拉起')
    startServer()
  }

  // 不自动补开上传页：新建标签会把正在录单的标签页挤到后台，导致保存不触发
  // 需要时手动跑「启动图片上传.bat」或访问 http://127.0.0.1:8787/api/open
}

setInterval(loop, 3000)
loop()

process.on('SIGINT', () => {
  killServer()
  process.exit(0)
})
process.on('SIGTERM', () => {
  killServer()
  process.exit(0)
})

log('监听中：浏览器关掉即自动收尾')
