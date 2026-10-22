import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages()[0]
const wrap = page.locator('.label-wrapper').nth(12)
const inp = wrap.locator('input.com-input-element').first()
const b = await inp.boundingBox()
await page.mouse.click(b.x+b.width/2, b.y+b.height/2)
await page.waitForTimeout(500)
await inp.fill('03744302')
await page.waitForTimeout(3000)
console.log('候选:', await page.evaluate(()=>[...document.querySelectorAll('li.com-realtime-async-request-li')].filter(e=>e.offsetParent!==null).map(e=>e.textContent.trim()).slice(0,3)))
console.log('面板:', await page.evaluate(()=>[...document.querySelectorAll('.com-realtime-async-request-container')].filter(e=>e.offsetParent!==null).length))
console.log('输入框值:', await inp.inputValue())
// 试 ArrowDown+Enter
await page.keyboard.press('ArrowDown'); await page.waitForTimeout(300); await page.keyboard.press('Enter')
await page.waitForTimeout(1500)
console.log('回车后:', (await wrap.innerText()).replace(/\s+/g,' ').trim().slice(0,50), '| val=', await inp.inputValue())
await page.screenshot({path:'user-debug.png'})
await close(ctx); process.exit(0)
