import { connect, close, BASE } from './lib/browser.mjs'

const DUP = 'G20261022000393'

// 1) OpenAPI 里找删除类接口
const pw = 'vibelink-4b248bee52bd448185bd'
const auth = 'Basic ' + Buffer.from('opencode:' + pw).toString('base64')
const spec = await (await fetch('http://127.0.0.1:4599/openapi.json', { headers: { Authorization: auth } })).json()
console.log('=== OpenAPI 中含 delete/remove/cancel 的接口 ===')
let n = 0
for (const [p, methods] of Object.entries(spec.paths)) {
  for (const [m, def] of Object.entries(methods)) {
    if (!['delete', 'post', 'put', 'patch'].includes(m)) continue
    const blob = (p + ' ' + JSON.stringify(def.requestBody || '')).toLowerCase()
    if (!/workorder|工单/.test(blob)) continue
    if (!/delete|remove|cancel|作废|删除|取消/.test(blob)) continue
    console.log(`  ${m.toUpperCase()} ${p}`)
    n++
  }
}
console.log('相关接口数:', n)

// 2) 列表页找该行和它的操作入口
const ctx = await connect()
let page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? ctx.pages()[0]
await page.goto(`${BASE}/workOrder/list`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)

const inputs = await page.evaluate(() =>
  [...document.querySelectorAll('input')].map((i, idx) => ({ idx, ph: i.placeholder || '', type: i.type }))
)
console.log('\n=== 列表页输入框 ===')
inputs.forEach((i) => console.log(`  [${i.idx}] ${i.type} "${i.ph}"`))

// 点“已关闭”tab
const tabBox = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && (e.innerText || '').trim() === '已关闭')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
if (tabBox) {
  await page.mouse.click(tabBox.x + tabBox.w / 2, tabBox.y + tabBox.h / 2)
  await page.waitForTimeout(2500)
}

// 在工单编号输入框填单号
await page.evaluate((code) => {
  const inputs = [...document.querySelectorAll('input')]
  const target = inputs.find((i) => /工单编号|编号|单号/.test(i.placeholder || ''))
  if (!target) return false
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(target, code)
  target.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}, DUP)
await page.waitForTimeout(500)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '查询')
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
})
await page.waitForTimeout(4000)

const rowInfo = await page.evaluate((code) => {
  const tr = [...document.querySelectorAll('tr')].find((t) => t.innerText.includes(code))
  if (!tr) return 'row not found'
  const cells = [...tr.querySelectorAll('td')].map((c) => (c.innerText || '').trim().slice(0, 16))
  const acts = [...tr.querySelectorAll('button,a,i,span,div')]
    .filter((e) => !e.children.length && (e.innerText || '').trim().length <= 6 && (e.innerText || '').trim())
    .map((e) => ({ t: e.innerText.trim(), cls: (e.className || '').toString().slice(0, 40) }))
  return JSON.stringify({ cells, acts }, null, 1)
}, DUP)
console.log('\n=== 目标行 ===\n' + rowInfo)
await page.screenshot({ path: 'dup-row2.png' })
await close(ctx)
process.exit(0)
