import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')

// 1) 记录窗口号，跑完能归位
s = s.replace(
`async function parkWindow() {
  try {
    const s = await ctx.newCDPSession(page)
    const { windowId } = await s.send('Browser.getWindowForTarget')
    await s.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'normal', left: -2400, top: 0, width: 1400, height: 950 },
    })
    console.log('[*] 窗口已移到屏幕外（不抢焦点）')
  } catch (e) {
    console.log('[*] 移窗失败（不影响运行）:', e.message.slice(0, 60))
  }
}`,
`let PARKED_WINDOW = null

async function parkWindow() {
  try {
    const s = await ctx.newCDPSession(page)
    const { windowId } = await s.send('Browser.getWindowForTarget')
    PARKED_WINDOW = windowId
    await s.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'normal', left: -2400, top: 0, width: 1400, height: 950 },
    })
    console.log('[*] 窗口临时移到屏幕外（跑完自动归位）')
  } catch (e) {
    console.log('[*] 移窗失败（不影响运行）:', e.message.slice(0, 60))
  }
}

/** 跑完/出错/中断时把窗口挪回可见位置，否则用户找不到它 */
async function restoreWindow() {
  if (!PARKED_WINDOW) return
  try {
    const s = await ctx.newCDPSession(page)
    await s.send('Browser.setWindowBounds', {
      windowId: PARKED_WINDOW,
      bounds: { windowState: 'normal', left: 120, top: 60, width: 1600, height: 960 },
    })
    console.log('[*] 窗口已归位')
  } catch {}
  PARKED_WINDOW = null
}`)

// 2) 结束时归位
s = s.replace(
`await exportState(ctx).catch(() => {})
await close(ctx)
process.exit(0)`,
`await restoreWindow()
await exportState(ctx).catch(() => {})
await close(ctx)
process.exit(0)`)

// 3) 中断也归位
s = s.replace(
`await parkWindow()
const results = []`,
`await parkWindow()
process.on('SIGINT', async () => {
  await restoreWindow()
  process.exit(130)
})
process.on('SIGTERM', async () => {
  await restoreWindow()
  process.exit(143)
})
const results = []`)

fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('ok')
