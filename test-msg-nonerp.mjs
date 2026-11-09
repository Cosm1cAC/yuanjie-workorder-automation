import { chromium } from 'playwright'
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--no-proxy-server'] })
const page = await browser.newPage({ viewport:{width:1440,height:1300} })
await page.goto('http://127.0.0.1:8787/?v=31', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(1200)
await page.evaluate(() => {
  window.__sent = null
  const of = window.fetch
  window.fetch = (u, o) => {
    if (String(u).includes('/api/send')) { window.__sent = o && o.body; return Promise.resolve(new Response(JSON.stringify({ok:true}),{status:200,headers:{'Content-Type':'application/json'}})) }
    return of(u, o)
  }
})
// 非 ERP：安防
await page.click('[data-tpl="security"]')
await page.fill('#site','四川-达州-宣汉县网点818003')
await page.fill('#note','接入完成')
await page.evaluate(async () => {
  const blob = await (await fetch('/logo.png')).blob()
  const f = new File([blob], '模板测试.png', { type:'image/png' })
  const dt = new DataTransfer(); dt.items.add(f)
  document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles:true, cancelable:true }))
})
await page.waitForTimeout(400)
await page.click('#send'); await page.waitForTimeout(2500)
console.log('=== 非 ERP 消息 ===')
console.log(await page.evaluate(()=>window.__sent ? JSON.parse(window.__sent).text : '(未捕获)'))
// ERP：验证必填
await page.click('[data-tpl="erp-system"]'); await page.waitForTimeout(300)
console.log('\n切回 ERP 后 省区可见:', await page.locator('#province').isVisible())
await browser.close(); process.exit(0)
