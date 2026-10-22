import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages()[0]
console.log(await page.evaluate(()=>{
  const w=[...document.querySelectorAll('.label-wrapper')]
  return w.slice(6,13).map((x,i)=>`${i+6}: ${(x.innerText||'').replace(/\s+/g,' ').trim().slice(0,60)}`).join('\n')
}))
await close(ctx); process.exit(0)
