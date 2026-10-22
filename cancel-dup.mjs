import { connect, close, BASE } from './lib/browser.mjs'

const DUP_ID = 263414
const DUP_CODE = 'G20261022000393'

const ctx = await connect()
const page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? ctx.pages()[0]
await page.goto(`${BASE}/workOrder/detail?workOrderId=${DUP_ID}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)

const shown = await page.evaluate(() => document.body.innerText.slice(0, 400))
console.log('页面确认:', shown.includes(DUP_CODE) ? `是 ${DUP_CODE}` : shown.slice(0, 160).replace(/\n/g, ' | '))
if (!shown.includes(DUP_CODE)) {
  console.log('对不上，放弃操作')
  await close(ctx)
  process.exit(0)
}

// 点“取消”
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '取消')
  if (!b) return false
  b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  return true
})
console.log('点了取消:', clicked)
await page.waitForTimeout(2500)

const dlg = await page.evaluate(() => {
  const dialogs = [...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=popover]')].filter((e) => e.offsetParent !== null)
  const t = dialogs.map((d) => ({
    text: (d.innerText || '').replace(/\s+/g, ' ').slice(0, 220),
    inputs: [...d.querySelectorAll('input,textarea')].map((i) => i.placeholder || i.type),
    buttons: [...d.querySelectorAll('button,.com-button-layout')].map((b) => (b.innerText || '').trim()).filter(Boolean),
  }))
  return JSON.stringify(t, null, 1)
})
console.log('弹窗:', dlg)
await page.screenshot({ path: 'dup-cancel.png' })
await close(ctx)
process.exit(0)
