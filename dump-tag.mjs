import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('/workOrder/add'))
if(!page){ console.log('没有新增页'); process.exit(0) }
console.log(await page.evaluate(()=>{
  const w=document.querySelectorAll('.label-wrapper')[7]
  const inp=w?.querySelector('input')
  return JSON.stringify({
    wrapperText:(w?.innerText||'').replace(/\s+/g,' ').slice(0,200),
    inputValue: inp?.value,
    inputName: inp?.name,
    contentHTML:(w?.querySelector('.label-content')?.innerHTML||'').replace(/\s+/g,' ').slice(0,600),
  },null,1)
}))
await close(ctx); process.exit(0)
