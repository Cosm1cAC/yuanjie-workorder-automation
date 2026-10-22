import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('127.0.0.1:8787'))
await page.bringToFront()
await page.screenshot({ path:'upload-ui7.png', fullPage:false, timeout: 60000 })
console.log('shot ok')
const info = await page.evaluate(()=>{
  const item=document.querySelector('.item')
  const r=e=>{const b=e.getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height)}}
  return item ? {item:r(item), name:r(item.querySelector('.name')), sub:r(item.querySelector('.sub')), acts:r(item.querySelector('.acts')), metaDisplay:getComputedStyle(item.querySelector('.meta')).display} : 'no item'
})
console.log(JSON.stringify(info))
await close(ctx); process.exit(0)
