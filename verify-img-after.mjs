import { connect, close, BASE } from './lib/browser.mjs'
import { apiPost, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'四川省区夹江客户宋倩', size:100 }))
const recs = (j?.data?.viewPage?.records||[]).sort((a,b)=>String(a.code).localeCompare(String(b.code)))
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('/workOrder')) ?? await ctx.newPage()
for (const r of [recs[0], recs[5], recs[26]]) {
  await page.goto(`${BASE}/workOrder/detail?workOrderId=${r.id}`, { waitUntil:'domcontentloaded' })
  await page.waitForTimeout(4500)
  const n = await page.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>/oss-cn|workorder/i.test(i.src)).length)
  const phone = (await page.evaluate(()=>document.body.innerText)).match(/联系方式[：:\s]*(\d{11})/)?.[1] || '(空)'
  console.log(`${r.code} 图片=${n} 联系方式=${phone}`)
}
await close(ctx); process.exit(0)
