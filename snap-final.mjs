import { connect, close, workPage } from './lib/browser.mjs'
const ctx = await connect()
const page = await workPage(ctx)
await page.bringToFront()
await page.screenshot({ path: 'final-28.png', fullPage: true })
console.log('URL:', page.url())
console.log('tabs:', ctx.pages().map(p=>p.url()).join(' , '))
await close(ctx); process.exit(0)
