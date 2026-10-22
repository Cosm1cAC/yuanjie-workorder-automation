// 登录：连接常驻 Chrome，等你扫码，完成后导出登录态
// 本脚本结束后 Chrome 窗口仍然留在桌面上
import { connect, close, exportState, BASE, STATE_FILE } from './lib/browser.mjs'

const target = process.argv[2] || `${BASE}/workOrder/add`
const ctx = await connect()

// 新开标签页，不动用户正在看的页面
const page = await ctx.newPage()
await page.bringToFront()

console.log('[*] 打开:', target)
await page.goto(target, { waitUntil: 'domcontentloaded' })

// 已登录就直接导出；否则等扫码
const loggedIn = () => page.url().startsWith(BASE)
const TIMEOUT = 10 * 60 * 1000
const t0 = Date.now()

while (!loggedIn() && Date.now() - t0 < TIMEOUT) {
  await page.waitForTimeout(1500)
}

if (loggedIn()) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await exportState(ctx)
  console.log('[+] 登录态已保存 ->', STATE_FILE)
  console.log('[*] Chrome 窗口会继续留在桌面上，本脚本即将退出')
} else {
  console.log('[x] 超时未完成登录')
}

await close(ctx)
process.exit(0)