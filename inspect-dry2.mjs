import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('/workOrder/add'))
console.log(await page.evaluate(()=>{
  const w=[...document.querySelectorAll('.label-wrapper')]
  const g=(i)=>{const el=w[i]?.querySelector('input'); return el?el.value:'(no)'}
  return ['系统='+g(6),'分类='+g(8),'类型='+g(9),'渠道='+g(10),'时长='+g(11),'第12栏='+(w[12]?.innerText||'').replace(/\s+/g,' ').slice(0,40)+' val='+g(12)].join('\n')
}))
await page.screenshot({path:'printer-dry2.png'})
await close(ctx); process.exit(0)
