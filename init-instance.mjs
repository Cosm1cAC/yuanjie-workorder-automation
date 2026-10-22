// 启动一个新的常驻 Chrome（独立端口/目录），并注入已保存的登录态
import { connect, close, BASE, CDP_PORT, PROFILE_DIR } from './lib/browser.mjs'
import fs from 'node:fs'

console.log('port:', CDP_PORT, 'profile:', PROFILE_DIR)
const ctx = await connect()

if (fs.existsSync('.auth-state.json')) {
  const st = JSON.parse(fs.readFileSync('.auth-state.json', 'utf8'))
  await ctx.addCookies(st.cookies || []).catch((e) => console.log('addCookies:', e.message))
  console.log('已注入 cookies:', (st.cookies || []).length)
}

const page = ctx.pages()[0] ?? (await ctx.newPage())
await page.goto(`${BASE}/workOrder/add`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)
console.log('URL:', page.url())
console.log('label-wrapper:', await page.locator('.label-wrapper').count())
await close(ctx)
process.exit(0)