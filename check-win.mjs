import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages()[0]
const s = await ctx.newCDPSession(page)
const { windowId } = await s.send('Browser.getWindowForTarget')
console.log('窗口位置:', JSON.stringify((await s.send('Browser.getWindowBounds',{windowId})).bounds))
await close(ctx); process.exit(0)
