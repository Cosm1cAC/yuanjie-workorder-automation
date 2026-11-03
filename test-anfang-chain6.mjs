import { connect, close, BASE } from './lib/browser.mjs'
const chain = ['安防平台','网点监控','网点监控配置','网点监控离线','监控离线','监控离线']
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('/workOrder')) ?? await ctx.newPage()
await page.bringToFront()
await page.goto(`${BASE}/workOrder/add`, { waitUntil:'domcontentloaded' })
await page.waitForSelector('.label-wrapper',{timeout:25000}); await page.waitForTimeout(600)
await page.evaluate(()=>{const b=[...document.querySelectorAll('button,.com-button-layout')].find(x=>(x.innerText||'').trim()==='重置'); b?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))})
await page.waitForTimeout(400); await page.keyboard.press('Escape')
const label = async()=> (await page.evaluate(()=>(document.querySelectorAll('.label-wrapper')[7]?.innerText||'').replace(/\s+/g,' ').trim()))

const el = page.locator('.label-wrapper').nth(7).locator('input.com-input-element').first()
const b = await el.boundingBox(); await page.mouse.click(b.x+b.width/2, b.y+b.height/2)
await page.waitForTimeout(800)
for (let i=0;i<chain.length;i++){
  const r = await page.evaluate(({txt,lv})=>{
    const cols=[...document.querySelectorAll('.com-tree-flat-ul')].filter(c=>c.offsetParent!==null)
    const col=cols[lv]||cols[cols.length-1]
    if(!col) return null
    const el=[...col.querySelectorAll('li.com-tree-flat-li')].find(x=>(x.textContent||'').trim()===txt)
    if(!el) return {miss:true, head:[...col.querySelectorAll('li.com-tree-flat-li')].slice(0,8).map(x=>x.textContent.trim())}
    el.scrollIntoView({block:'center'}); const bb=el.getBoundingClientRect()
    return {x:bb.x,y:bb.y,w:bb.width,h:bb.height}
  },{txt:chain[i],lv:i})
  if(!r||r.miss){ console.log(`L${i+1} 失败`, JSON.stringify(r).slice(0,150)); break }
  await page.mouse.click(r.x+r.w/2, r.y+r.h/2)
  await page.waitForTimeout(600)
  console.log(`L${i+1} ${chain[i]} → ${(await label()).slice(0,110)}`)
}
await close(ctx); process.exit(0)
