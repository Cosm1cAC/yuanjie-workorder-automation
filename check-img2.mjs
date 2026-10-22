import { connect, close, BASE } from './lib/browser.mjs'
const ctx = await connect()
const page = await ctx.newPage()
await page.goto(`${BASE}/workOrder/detail?workOrderId=263579`, { waitUntil:'domcontentloaded' }).catch(()=>{})
await page.waitForTimeout(6000)
const t = await page.evaluate(()=>document.body.innerText.slice(0,120).replace(/\n/g,' | '))
console.log(t)
console.log('图片数:', await page.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>/oss-cn|workorder/i.test(i.src)).length))
await close(ctx); process.exit(0)
