// 批量改「联系方式」：逐单进编辑页改手机号再保存
// 用法：node update-contact.mjs "<标题前缀>" <新手机号>
import { connect, close, exportState, BASE } from './lib/browser.mjs'
import { apiPost, ORDER_PAGE } from './api.mjs'

const prefix = process.argv[2]
const phone = process.argv[3]
if (!prefix || !phone) {
  console.error('用法: node update-contact.mjs "<标题前缀>" <新手机号>')
  process.exit(1)
}

const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title: prefix, size: 100 }))
const recs = (j?.data?.viewPage?.records || []).sort((a, b) => String(a.code).localeCompare(String(b.code)))
console.log(`匹配 ${recs.length} 单，目标手机号 ${phone}`)

const ctx = await connect()
const page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? (await ctx.newPage())
page.on('dialog', (d) => d.accept().catch(() => {}))

let ok = 0
let skip = 0
let fail = 0
const failed = []

for (const [i, r] of recs.entries()) {
  if (r.mobileNumber === phone) {
    skip++
    continue
  }
  const t0 = Date.now()
  try {
    await page.goto(`${BASE}/workOrder/add?workOrderId=${r.id}`, { waitUntil: 'domcontentloaded' })
    // 等回填
    let filled = false
    for (let k = 0; k < 40; k++) {
      await page.waitForTimeout(400)
      filled = await page.evaluate(() => (document.querySelectorAll('.com-textarea-element')[0]?.value || '').length > 0)
      if (filled) break
    }
    if (!filled) throw new Error('表单未回填')

    const idx = await page.evaluate(() => {
      const w = [...document.querySelectorAll('.label-wrapper')]
      return w.findIndex((x) => /联系方式/.test((x.innerText || '').trim()))
    })
    if (idx < 0) throw new Error('没找到联系方式字段')

    const inp = page.locator('.label-wrapper').nth(idx).locator('input').first()
    await inp.fill(phone)
    await page.waitForTimeout(200)

    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '保存工单')
      b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    })
    const t1 = Date.now()
    while (Date.now() - t1 < 20000) {
      await page.waitForTimeout(500)
      if (!page.url().includes('/workOrder/add')) break
    }
    if (page.url().includes('/workOrder/add')) throw new Error('保存未跳转')

    ok++
    console.log(`✓ ${i + 1}/${recs.length} ${r.code} ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  } catch (e) {
    fail++
    failed.push(`${r.code} ${e.message}`)
    console.log(`✗ ${r.code} ${String(e.message).slice(0, 60)}`)
  }
}

console.log(`\n成功 ${ok} | 已是目标号跳过 ${skip} | 失败 ${fail}`)
if (failed.length) console.log(failed.join('\n'))
await exportState(ctx).catch(() => {})
await close(ctx)
process.exit(0)
