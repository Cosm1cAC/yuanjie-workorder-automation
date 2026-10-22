import { connect, close, BASE } from './lib/browser.mjs'
const ctx = await connect()
const page = await ctx.newPage()
await page.goto(`${BASE}/workOrder/list`, { waitUntil:'domcontentloaded' })
await page.waitForTimeout(5000)
console.log('初始工具栏:', await page.evaluate(()=>[...new Set([...document.querySelectorAll('button,.com-button-layout')].map(b=>(b.innerText||'').trim()).filter(Boolean))].join(' | ')))
// 勾选第一行
const checked = await page.evaluate(()=>{
  const trs=[...document.querySelectorAll('tr')].filter(t=>t.querySelectorAll('td').length>3)
  const tr=trs[trs.length-1]
  const cb=tr?.querySelector('input[type=checkbox], .com-checkbox-input, [class*=checkbox]')
  if(!cb) return 'no checkbox'
  cb.click?.()
  return 'clicked'
})
console.log('勾选:', checked)
await page.waitForTimeout(2000)
console.log('勾选后工具栏:', await page.evaluate(()=>[...new Set([...document.querySelectorAll('button,.com-button-layout')].map(b=>(b.innerText||'').trim()).filter(Boolean))].join(' | ')))
await page.screenshot({path:'bulk-check.png'})
await close(ctx); process.exit(0)
