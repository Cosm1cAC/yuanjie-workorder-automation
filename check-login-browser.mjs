import { connect, close, exportState, BASE } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages()[0] ?? await ctx.newPage()
await page.goto(`${BASE}/workOrder/list`, { waitUntil:'domcontentloaded' })
await page.waitForTimeout(5000)
console.log('URL:', page.url())
const logged = page.url().startsWith(BASE)
console.log('已登录:', logged)
if (logged) {
  await exportState(ctx)
  console.log('已重新导出 .auth-state.json')
}
await close(ctx); process.exit(0)
