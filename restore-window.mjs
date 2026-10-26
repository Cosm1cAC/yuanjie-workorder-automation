// 把专用 Chrome 窗口挪回屏幕可见位置
import { connect, close } from './lib/browser.mjs'

const ctx = await connect()
const page = ctx.pages()[0] ?? (await ctx.newPage())
const s = await ctx.newCDPSession(page)
const { windowId } = await s.send('Browser.getWindowForTarget')
await s.send('Browser.setWindowBounds', {
  windowId,
  bounds: { windowState: 'normal', left: 120, top: 60, width: 1600, height: 960 },
})
await page.bringToFront()
console.log('窗口已归位到 (120, 60) 1600x960')
await close(ctx)
process.exit(0)
