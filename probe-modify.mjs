import { connect, close, BASE } from './lib/browser.mjs'
const ctx = await connect()
const page = await ctx.newPage()
await page.goto(`${BASE}/workOrder/detail?workOrderId=263414`, { waitUntil:'domcontentloaded' })
await page.waitForTimeout(6000)
console.log('页面单号确认:', (await page.evaluate(()=>document.body.innerText)).includes('G20261022000393'))
await page.evaluate(()=>{
  const b=[...document.querySelectorAll('button,.com-button-layout')].find(x=>(x.innerText||'').trim()==='修改')
  b?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))
})
await page.waitForTimeout(3000)
console.log('修改面板按钮:', await page.evaluate(()=>{
  const btns=[...document.querySelectorAll('button,.com-button-layout')].map(b=>(b.innerText||'').trim()).filter(Boolean)
  return [...new Set(btns)].join(' | ')
}))
console.log('页面含删除/作废:', await page.evaluate(()=>{
  const t=document.body.innerText
  return ['删除','作废','撤回','关闭工单'].filter(k=>t.includes(k)).join(',') || '无'
}))
await page.screenshot({path:'dup-modify.png'})
await close(ctx); process.exit(0)
