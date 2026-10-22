// 圆捷工单 - 浏览器连接层
//
// 关键设计：浏览器窗口独立于本进程存在。
// 用 Chrome 自带的 --remote-debugging-port 启动一个常驻 Chrome，
// 本脚本只用 connectOverCDP 远程连接。脚本结束 / 崩溃都不会带走窗口。
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

export const PROFILE_DIR = process.env.YTO_PROFILE
  ? path.resolve(ROOT, process.env.YTO_PROFILE)
  : path.join(ROOT, '.chrome-profile2') // 常驻 Chrome 的用户目录
export const STATE_FILE = path.join(ROOT, '.auth-state.json') // cookie 快照，换实例时用来续登录态
export const BASE = 'https://yto-agile.yto56.com.cn:7100'
export const CDP_PORT = Number(process.env.YTO_CDP_PORT || 9333)

const CHROME = path.join(
  process.env.LOCALAPPDATA || '',
  'Google/Chrome/Application/chrome.exe'
)

function log(...a) {
  console.log('   ', ...a)
}

async function cdpAlive() {
  try {
    const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)
    return r.ok
  } catch {
    return false
  }
}

/**
 * 确保常驻 Chrome 存在。已存在就直接复用，绝不 kill、绝不重开。
 */
export async function ensureChrome() {
  if (await cdpAlive()) {
    log(`复用已在运行的调试 Chrome (127.0.0.1:${CDP_PORT})`)
    return
  }
  if (!fs.existsSync(CHROME)) {
    throw new Error(`找不到 Chrome: ${CHROME}`)
  }
  fs.mkdirSync(PROFILE_DIR, { recursive: true })
  log(`启动常驻 Chrome（独立进程，窗口会一直留在桌面）`)
  const child = spawn(
    CHROME,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--no-proxy-server',
      // 窗口移到屏幕外后 Chrome 会当成被遮挡并节流，这几项要关掉
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion',
      '--window-position=0,0',
      '--window-size=1920,1080',
      `${BASE}/workOrder/add`,
    ],
    { detached: true, stdio: 'ignore' }
  )
  child.unref()

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    if (await cdpAlive()) {
      log('常驻 Chrome 就绪')
      return
    }
  }
  throw new Error('Chrome 调试端口未就绪')
}

/**
 * 连接常驻 Chrome，返回 { ctx, browser }。
 * 断开连接不会关闭浏览器。
 */
export async function connect() {
  await ensureChrome()
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, { timeout: 120000 })
  const ctx = browser.contexts()[0] ?? (await browser.newContext())
  ctx.setDefaultTimeout(45000)
  ctx.setDefaultNavigationTimeout(60000)
  ctx.__cdp = true
  ctx.__browser = browser
  return ctx
}

/** 断开连接但保留浏览器窗口 */
export async function close(ctx) {
  try {
    if (ctx?.__cdp) {
      // connectOverCDP 的 browser.close() 只断开连接，不会关掉 Chrome。
      // 不 disconnect 会累积 CDP 会话，导致后续 connect 超时。
      await ctx.storageState({ path: STATE_FILE }).catch(() => {})
      await ctx.__browser?.close().catch(() => {})
      return
    }
    await ctx.close()
  } catch {}
}

/** 把常驻 Chrome 的登录态导出，给无头探查脚本用 */
export async function exportState(ctx) {
  await ctx.storageState({ path: STATE_FILE })
  return STATE_FILE
}

/**
 * 取「工位标签页」：如果已经有 /workOrder/add 就复用，没有再新建。
 * 所有脚本共用同一个标签页，不会每跑一次多开一个。
 */
export async function workPage(ctx) {
  const existing = ctx.pages().find((p) => p.url().includes('/workOrder/add'))
  if (existing) return existing
  return await ctx.newPage()
}

/** 无头探查：用已保存的登录态开一次性浏览器，用完即弃，不影响桌面窗口 */
export async function headless() {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('没有登录态快照，请先跑 login.mjs')
  }
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    ignoreHTTPSErrors: true,
    proxy: { server: 'direct://' },
    args: ['--no-proxy-server', '--disable-features=IsolateOrigins,site-per-process'],
  })
  const ctx = await browser.newContext({
    storageState: STATE_FILE,
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
  })
  ctx.setDefaultTimeout(45000)
  ctx.setDefaultNavigationTimeout(60000)
  ctx.__onClose = () => browser.close()
  return ctx
}