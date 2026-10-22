import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
console.log('pages:', ctx.pages().length)
for (const [i,p] of ctx.pages().entries()) {
  const info = await p.evaluate(()=>{
    const w=[...document.querySelectorAll('.label-wrapper')]
    const g=(k)=>{const el=w[k]?.querySelector('input'); return el?el.value:''}
    return { url: location.href, subj: (document.querySelectorAll('.com-textarea-element')[0]?.value||'').slice(0,20), sys: g(6), tag: (w[7]?.innerText||'').replace(/\s+/g,' ').slice(0,30), dur: g(11), user: g(12) }
  }).catch(e=>({err:String(e).slice(0,40)}))
  console.log(` [${i}]`, JSON.stringify(info))
}
await close(ctx); process.exit(0)
