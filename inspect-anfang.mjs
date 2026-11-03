import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('/workOrder/add'))
if(!page){ console.log('no add page'); process.exit(0) }
console.log(await page.evaluate(()=>{
  const w=[...document.querySelectorAll('.label-wrapper')]
  return w.slice(6,13).map((x,i)=>`${i+6}: ${(x.innerText||'').replace(/\s+/g,' ').trim().slice(0,70)}`).join('\n')
}))
await page.screenshot({path:'anfang-dry.png'})
await close(ctx); process.exit(0)
