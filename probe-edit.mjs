// 打开一单的「修改」，看清表单结构，并抓保存请求的报文
import { connect, close, BASE } from './lib/browser.mjs'
import { apiPost, ORDER_PAGE } from './api.mjs'

const NEW_PHONE = '15391580087'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title: '四川省区夹江客户宋倩', size: 100 }))
const recs = (j?.data?.viewPage?.records || []).sort((a, b) => String(a.code).localeCompare(String(b.code)))
const target = recs.find((r) => r.title.endsWith('订单审核'))
console.log('目标:', target.code, target.id, target.title)

const ctx = await connect()
const page = await ctx.newPage()
await page.goto(`${BASE}/workOrder/detail?workOrderId=${target.id}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)

// 点修改
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '修改')
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
})
await page.waitForTimeout(3000)

console.log('\n=== 修改表单字段 ===')
console.log(
  await page.evaluate(() => {
    const w = [...document.querySelectorAll('.label-wrapper')]
    return w
      .map((x, i) => {
        const el = x.querySelector('input,textarea')
        return `${i}: ${(x.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30)} | val=${el ? String(el.value).slice(0, 30) : ''}`
      })
      .join('\n')
  })
)

const net = []
page.on('request', (r) => {
  if (r.method() !== 'GET' && /workOrder/i.test(r.url())) net.push({ url: r.url(), body: r.postData() })
})

// 改联系方式
const contactIdx = await page.evaluate(() => {
  const w = [...document.querySelectorAll('.label-wrapper')]
  return w.findIndex((x) => /联系方式/.test((x.innerText || '').trim()))
})
console.log('\n联系方式字段下标:', contactIdx)
if (contactIdx >= 0) {
  const inp = page.locator('.label-wrapper').nth(contactIdx).locator('input').first()
  await inp.fill(NEW_PHONE)
  await page.waitForTimeout(300)
  console.log('已填入:', await inp.inputValue())
}

// 保存
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '保存工单')
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
})
await page.waitForTimeout(6000)
console.log('\nURL:', page.url())
console.log('请求数:', net.length)
net.slice(-2).forEach((n) => console.log(`  ${n.url}\n  body=${String(n.body).slice(0, 600)}`))
await close(ctx)
process.exit(0)
