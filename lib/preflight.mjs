// 运行前自检：CDP 是否活着、登录态是否有效；能自动恢复就不劳人
import { execSync, spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CDP_PORT = Number(process.env.YTO_CDP_PORT || 9344)
const UPLOAD_PORT = 8787

async function ok(url, ms = 2000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms) })
    return r.ok
  } catch {
    return false
  }
}

async function waitFor(url, ms) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await ok(url)) return true
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

function killAndroidLike() {
  // 停掉看门狗/服务
  try {
    const out = execSync(`wmic process where "name='node.exe' and (commandline like '%upload-watchdog%' or commandline like '%upload-server%')" get processid`, {
      encoding: 'utf8',
    })
    out
      .split(/\r?\n/)
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0)
      .forEach((pid) => {
        try {
          process.kill(pid)
        } catch {}
      })
  } catch {}
  // 杀掉占用调试端口的 Chrome
  try {
    const out = execSync(`netstat -ano | findstr ":${CDP_PORT}"`, { encoding: 'utf8' })
    out
      .split(/\r?\n/)
      .filter((l) => l.includes('LISTENING'))
      .forEach((l) => {
        const pid = Number(l.trim().split(/\s+/).pop())
        if (pid) {
          try {
            process.kill(pid)
          } catch {}
        }
      })
  } catch {}
}

function startStack() {
  const bat = path.join(ROOT, '启动图片上传.bat')
  spawn('cmd', ['/c', bat], { cwd: ROOT, detached: true, stdio: 'ignore', windowsHide: true }).unref()
}

/**
 * 返回 { cdp, upload } 两个健康标记；必要时自动重启整栈。
 */
export async function preflight({ allowRestart = true } = {}) {
  let cdp = await ok(`http://127.0.0.1:${CDP_PORT}/json/version`, 2500)
  let upload = await ok(`http://127.0.0.1:${UPLOAD_PORT}/api/ping`, 2000)

  if (cdp) return { cdp, upload, restarted: false }

  console.log('[preflight] CDP 无响应')
  if (!allowRestart) return { cdp: false, upload, restarted: false }

  console.log('[preflight] 自动重启浏览器与服务…')
  killAndroidLike()
  await new Promise((r) => setTimeout(r, 2500))
  startStack()

  cdp = await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`, 40000)
  upload = await waitFor(`http://127.0.0.1:${UPLOAD_PORT}/api/ping`, 10000)
  console.log(`[preflight] 重启完成 cdp=${cdp} upload=${upload}`)
  return { cdp, upload, restarted: true }
}

/** 登录态检查（cookie 直接打接口，不开浏览器） */
export async function checkLogin() {
  try {
    const { apiPost, ORDER_PAGE } = await import('../api.mjs')
    const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ size: 1 }))
    return !!j?.data
  } catch (e) {
    return String(e.message).includes('登录态失效') ? false : null
  }
}

// 直接运行时做一次自检
if (process.argv[1] && process.argv[1].endsWith('preflight.mjs')) {
  const r = await preflight()
  const login = await checkLogin()
  console.log(`CDP=${r.cdp} 上传服务=${r.upload} 登录=${login}`)
  process.exit(r.cdp && login === true ? 0 : 1)
}
