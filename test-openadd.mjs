import { connect, close, BASE } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages()[0]
await page.goto(`${BASE}/workOrder/list`, { waitUntil:'domcontentloaded' })
await page.waitForTimeout(3500)
const t0 = Date.now()
const clicked = await page.evaluate(()=>{
  const b=[...document.querySelectorAll('button,.com-button-layout')].find(x=>(x.innerText||'').trim()==='新建工单')
  if(!b) return false
  b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))
  return true
})
try { await page.waitForSelector('.label-wrapper',{timeout:12000}) } catch {}
console.log('点击新建工单:', clicked, '| 表单出现耗时:', ((Date.now()-t0)/1000).toFixed(1)+'s', '| url:', page.url())
await close(ctx); process.exit(0)
