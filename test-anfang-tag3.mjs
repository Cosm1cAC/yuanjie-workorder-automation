import { connect, close, BASE } from './lib/browser.mjs'
const chain = ['安防平台','网点监控','网点监控配置','OSD需接入安防平台','监控接入安防平台']
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('/workOrder')) ?? await ctx.newPage()
await page.bringToFront()
await page.goto(`${BASE}/workOrder/add`, { waitUntil:'domcontentloaded' })
await page.waitForSelector('.label-wrapper',{timeout:25000}); await page.waitForTimeout(600)
await page.bringToFront()
await page.evaluate(()=>{const b=[...document.querySelectorAll('button,.com-button-layout')].find(x=>(x.innerText||'').trim()==='重置'); b?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))})
await page.waitForTimeout(400); await page.keyboard.press('Escape')

const label = async()=> (await page.evaluate(()=>(document.querySelectorAll('.label-wrapper')[7]?.innerText||'').replace(/\s+/g,' ').trim()))

// 先选所属系统
{
  const el = page.locator('.label-wrapper').nth(6).locator('input.com-input-element').first()
  const b = await el.boundingBox(); await page.mouse.click(b.x+b.width/2, b.y+b.height/2)
  await page.waitForTimeout(400)
  const r = await page.evaluate(()=>{
    const e=[...document.querySelectorAll('li.com-items-list-li')].find(x=>x.offsetParent!==null&&x.textContent.trim()==='安防平台')
    if(!e) return null; e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect()
    return {x:b.x,y:b.y,w:b.width,h:b.height}
  })
  if(r) await page.mouse.click(r.x+r.w/2, r.y+r.h/2)
  await page.waitForTimeout(500)
  console.log('所属系统=', (await page.evaluate(()=>(document.querySelectorAll('.label-wrapper')[6]?.innerText||'').replace(/\s+/g,' ').trim())))
}

// 标签
{
  const el = page.locator('.label-wrapper').nth(7).locator('input.com-input-element').first()
  const b = await el.boundingBox(); await page.mouse.click(b.x+b.width/2, b.y+b.height/2)
  await page.waitForTimeout(800)
  for (let i=0;i<chain.length;i++){
    const r = await page.evaluate(({txt,lv})=>{
      const cols=[...document.querySelectorAll('.com-tree-flat-ul')].filter(c=>c.offsetParent!==null)
      const col=cols[lv]||cols[cols.length-1]
      if(!col) return null
      const el=[...col.querySelectorAll('li.com-tree-flat-li')].find(x=>(x.textContent||'').trim()===txt)
      if(!el) return {miss:true}
      el.scrollIntoView({block:'center'}); const b=el.getBoundingClientRect()
      return {x:b.x,y:b.y,w:b.width,h:b.height}
    },{txt:chain[i],lv:i})
    if(!r||r.miss){ console.log(`L${i+1} 失败`, JSON.stringify(r)); break }
    await page.mouse.click(r.x+r.w/2, r.y+r.h/2)
    await page.waitForTimeout(600)
    console.log(`L${i+1} ${chain[i]} → ${(await label()).slice(0,100)}`)
  }
}
await page.waitForTimeout(1200)
console.log('最终=', await label())
await page.screenshot({path:'anfang-tag3.png'})
await close(ctx); process.exit(0)
