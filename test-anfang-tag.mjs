import { connect, close, BASE } from './lib/browser.mjs'

const chain = ['安防平台', '网点监控', '网点监控配置', 'OSD需接入安防平台', '监控接入安防平台']

const ctx = await connect()
const page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? (await ctx.newPage())
await page.goto(`${BASE}/workOrder/add`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.label-wrapper', { timeout: 25000 })
await page.waitForTimeout(600)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '重置')
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
})
await page.waitForTimeout(400)
await page.keyboard.press('Escape')

// 选所属系统 = 安防平台
async function openField(idx) {
  await page.keyboard.press('Escape').catch(() => {})
  const el = page.locator('.label-wrapper').nth(idx).locator('input.com-input-element').first()
  await el.scrollIntoViewIfNeeded().catch(() => {})
  const b = await el.boundingBox()
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await page.waitForTimeout(200)
}

await openField(6)
const sysBox = await page.evaluate(() => {
  const el = [...document.querySelectorAll('li.com-items-list-li')].find(
    (e) => e.offsetParent !== null && (e.textContent || '').trim() === '安防平台'
  )
  if (!el) return null
  el.scrollIntoView({ block: 'center' })
  const b = el.getBoundingClientRect()
  return { x: b.x, y: b.y, w: b.width, h: b.height }
})
console.log('安防平台选项:', JSON.stringify(sysBox))
if (sysBox) await page.mouse.click(sysBox.x + sysBox.w / 2, sysBox.y + sysBox.h / 2)
await page.waitForTimeout(600)
console.log('所属系统:', await page.evaluate(() => (document.querySelectorAll('.label-wrapper')[6]?.innerText || '').replace(/\s+/g, ' ')))

// 标签
await openField(7)
await page.waitForTimeout(800)
for (const [i, want] of chain.entries()) {
  let done = false
  for (let t = 0; t < 8 && !done; t++) {
    const r = await page.evaluate(
      ({ txt, lv }) => {
        const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
        const col = cols[lv] || cols[cols.length - 1]
        if (!col) return { noCol: true, cols: cols.length }
        const items = [...col.querySelectorAll('li.com-tree-flat-li')]
        const el = items.find((x) => (x.textContent || '').trim() === txt)
        if (!el) return { missing: true, head: items.slice(0, 10).map((x) => (x.textContent || '').trim()), cols: cols.length }
        el.scrollIntoView({ block: 'center' })
        const b = el.getBoundingClientRect()
        return { x: b.x, y: b.y, w: b.width, h: b.height, cols: cols.length }
      },
      { txt: want, lv: i }
    )
    if (r.x) {
      await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2)
      await page.waitForTimeout(450)
      done = true
      console.log(`L${i + 1} ${want} ✓ (列数 ${r.cols})`)
    } else {
      await page.waitForTimeout(300)
      if (t === 7) console.log(`L${i + 1} ${want} ✗`, JSON.stringify(r).slice(0, 200))
    }
  }
  if (!done) break
}

console.log('\n最终标签:', await page.evaluate(() => (document.querySelectorAll('.label-wrapper')[7]?.innerText || '').replace(/\s+/g, ' ').slice(0, 160)))
await page.screenshot({ path: 'anfang-tagtest.png' })
await close(ctx)
process.exit(0)
