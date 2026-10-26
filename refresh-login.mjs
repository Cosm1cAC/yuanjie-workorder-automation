import { connect, close, exportState, BASE } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages()[0] ?? await ctx.newPage()
await page.goto(`${BASE}/workOrder/list`, { waitUntil:'domcontentloaded' })
await page.waitForTimeout(5000)
console.log('URL:', page.url(), '| 已登录:', page.url().startsWith(BASE))
if (page.url().startsWith(BASE)) { await exportState(ctx); console.log('已重新导出 cookie') }
await close(ctx); process.exit(0)
