// 编辑页：等数据回填后改联系方式并保存，抓取请求
import { connect, close, BASE } from './lib/browser.mjs'
import { apiPost, ORDER_PAGE } from './api.mjs'

const NEW_PHONE = '15391580087'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title: '四川省区夹江客户宋倩', size: 100 }))
const recs = (j?.data?.viewPage?.records || []).sort((a, b) => String(a.code).localeCompare(String(b.code)))
const target = recs.find((r) => r.title.endsWith('订单审核'))
console.log('目标:', target.code, target.id)

const ctx = await connect()
const page = await ctx.newPage()
const net = []
page.on('request', (r) => {
  if (r.method() !== 'GET' && /workOrder/i.test(r.url())) net.push({ url: r.url(), body: r.postData() })
})

await page.goto(`${BASE}/workOrder/add?workOrderId=${target.id}`, { waitUntil: 'domcontentloaded' })
// 等回填
let filled = false
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500)
  filled = await page.evaluate(() => (document.querySelectorAll('.com-textarea-element')[0]?.value || '').length > 0)
  if (filled) break
}
console.log('回填完成:', filled)

console.log(
  await page.evaluate(() => {
    const w = [...document.querySelectorAll('.label-wrapper')]
    const g = (i) => {
      const el = w[i]?.querySelector('input')
      return el ? String(el.value || '') : ''
    }
    return w
      .slice(6, 13)
      .map((x, i) => `${i + 6}: ${(x.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)} | val=${g(i + 6).slice(0, 24)}`)
      .join('\n')
  })
)

const idx = await page.evaluate(() => {
  const w = [...document.querySelectorAll('.label-wrapper')]
  return w.findIndex((x) => /联系方式/.test((x.innerText || '').trim()))
})
console.log('\n联系方式下标:', idx)

if (idx >= 0 && filled) {
  const inp = page.locator('.label-wrapper').nth(idx).locator('input').first()
  await inp.fill(NEW_PHONE)
  await page.waitForTimeout(300)
  console.log('填入后:', await inp.inputValue())

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '保存工单')
    b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  const t0 = Date.now()
  while (Date.now() - t0 < 20000) {
    await page.waitForTimeout(600)
    if (!page.url().includes('/workOrder/add')) break
  }
  console.log('保存后 URL:', page.url())
  net.slice(-2).forEach((n) => console.log(`  ${n.url}\n   body=${String(n.body).slice(0, 700)}`))
}
await close(ctx)
process.exit(0)
