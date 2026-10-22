import { apiPost, ORDER_PAGE } from './api.mjs'
import { connect, close, BASE } from './lib/browser.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'办公室打印机电脑连不上', responsibleNums:['03744302'] }))
const r = (j?.data?.viewPage?.records||[])[0]
console.log('code=', r.code, 'id=', r.id)
const ctx = await connect()
const page = await ctx.newPage()
await page.goto(`${BASE}/workOrder/detail?workOrderId=${r.id}`, { waitUntil:'domcontentloaded' })
await page.waitForTimeout(6000)
const body = await page.evaluate(()=>document.body.innerText.slice(0,160).replace(/\n/g,' | '))
console.log('详情:', body)
console.log('图片数:', await page.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>/oss-cn|workorder/i.test(i.src)).length))
console.log('解决图片存在:', await page.evaluate(()=>[...document.querySelectorAll('img')].some(i=>/oss-cn|workorder/i.test(i.src) && /image/i.test(i.src))))
await page.screenshot({path:'printer2-detail.png'})
await close(ctx); process.exit(0)
