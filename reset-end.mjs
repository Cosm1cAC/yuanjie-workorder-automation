import { connect, close, BASE } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages()[0]
await page.evaluate(()=>localStorage.removeItem('ADD_WORKORDER_KEY')).catch(()=>{})
await page.goto(`${BASE}/workOrder/list`, { waitUntil:'domcontentloaded' })
await page.waitForTimeout(2500)
console.log('tab:', page.url(), '| tabs:', ctx.pages().length)
await close(ctx); process.exit(0)
