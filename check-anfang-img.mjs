import { connect, close, BASE } from './lib/browser.mjs'
import { apiPost, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'德阳罗江网点监控接入安防平台', size:10 }))
const r = (j?.data?.viewPage?.records||[])[0]
const ctx = await connect()
const page = await ctx.newPage()
await page.goto(`${BASE}/workOrder/detail?workOrderId=${r.id}`, { waitUntil:'domcontentloaded' })
await page.waitForTimeout(5000)
console.log('详情:', (await page.evaluate(()=>document.body.innerText)).slice(0,120).replace(/\n/g,' | '))
console.log('图片数:', await page.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>/oss-cn|workorder/i.test(i.src)).length))
await page.screenshot({path:'anfang-detail.png'})
await close(ctx); process.exit(0)
