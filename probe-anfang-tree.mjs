// 探查「安防平台接入」的标签树层级与精确文本
import { connect, close, BASE } from './lib/browser.mjs'

const ctx = await connect()
const page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? (await ctx.newPage())
await page.goto(`${BASE}/workOrder/add`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.label-wrapper', { timeout: 25000 })
await page.waitForTimeout(500)

// 清空草稿 + 重置
if (page.url().startsWith(BASE)) await page.evaluate(() => localStorage.removeItem('ADD_WORKORDER_KEY')).catch(() => {})
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '重置')
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
})
await page.waitForTimeout(400)
await page.keyboard.press('Escape')

const inp = page.locator('.label-wrapper').nth(7).locator('input.com-input-element').first()
const b = await inp.boundingBox()
await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
await page.waitForTimeout(1500)

async function dumpLevel(n) {
  return await page.evaluate((lv) => {
    const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
    const col = cols[lv]
    if (!col) return []
    return [...col.querySelectorAll('li.com-tree-flat-li')].map((x) => JSON.stringify((x.textContent || '').trim()))
  }, n)
}

async function clickText(text, level) {
  for (let t = 0; t < 8; t++) {
    const r = await page.evaluate(
      ({ txt, lv }) => {
        const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
        const col = cols[lv] || cols[cols.length - 1]
        if (!col) return null
        const items = [...col.querySelectorAll('li.com-tree-flat-li')]
        const el = items.find((x) => (x.textContent || '').trim() === txt)
        if (!el) return { missing: true, head: items.slice(0, 20).map((x) => (x.textContent || '').trim()) }
        el.scrollIntoView({ block: 'center' })
        const bb = el.getBoundingClientRect()
        return { x: bb.x, y: bb.y, w: bb.width, h: bb.height }
      },
      { txt: text, lv: level }
    )
    if (!r) {
      await page.waitForTimeout(250)
      continue
    }
    if (r.missing) return r
    await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2)
    await page.waitForTimeout(400)
    return { ok: true }
  }
  return { fail: true }
}

console.log('L1 前 20 项:', (await dumpLevel(0)).slice(0, 20).join(' '))
console.log('点 安防平台:', JSON.stringify(await clickText('安防平台', 0)).slice(0, 150))
console.log('L2:', (await dumpLevel(1)).join(' '))
console.log('点 网点监控:', JSON.stringify(await clickText('网点监控', 1)).slice(0, 150))
console.log('L3:', (await dumpLevel(2)).join(' '))
console.log('点 网点监控配置:', JSON.stringify(await clickText('网点监控配置', 2)).slice(0, 200))
console.log('L4:', (await dumpLevel(3)).join(' '))

const l4 = await dumpLevel(3)
const pick4 = l4.find((s) => /OSD/.test(s)) || l4[0]
if (pick4) {
  const txt = JSON.parse(pick4)
  console.log('点 L4:', txt)
  console.log('结果:', JSON.stringify(await clickText(txt, 3)).slice(0, 150))
  console.log('L5:', (await dumpLevel(4)).join(' '))
}

await page.keyboard.press('Escape')
await close(ctx)
process.exit(0)
