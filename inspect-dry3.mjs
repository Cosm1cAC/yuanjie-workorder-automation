import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages()[0]
console.log(await page.evaluate(()=>{
  const w=[...document.querySelectorAll('.label-wrapper')]
  return w.slice(6,13).map((x,i)=>`${i+6}: ${(x.innerText||'').replace(/\s+/g,' ').trim()}`).join('\n')
}))
await page.screenshot({path:'printer-dry3.png'})
await close(ctx); process.exit(0)
