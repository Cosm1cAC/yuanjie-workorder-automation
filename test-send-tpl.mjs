import { chromium } from 'playwright'
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--no-proxy-server'] })
const page = await browser.newPage({ viewport:{width:1440,height:1300} })
await page.goto('http://127.0.0.1:8787/?v=21', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(1200)

// 拦截 /api/send，只记录不真发
await page.evaluate(() => {
  window.__sent = null
  const of = window.fetch
  window.fetch = (u, o) => {
    if (String(u).includes('/api/send')) {
      window.__sent = o && o.body
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    }
    return of(u, o)
  }
})

await page.click('[data-tpl="erp-system"]')
await page.selectOption('#province','四川省区')
await page.fill('#district','成东片区')
await page.fill('#customer','四川成东片区十陵蜀特客户')
await page.fill('#phone','17364791013')
await page.fill('#site','十陵网点')
await page.fill('#note','按系统模式拆单')

// 造图
await page.evaluate(async () => {
  const blob = await (await fetch('/logo.png')).blob()
  const f = new File([blob], '测试模板.png', { type: 'image/png' })
  const dt = new DataTransfer(); dt.items.add(f)
  document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
})
await page.waitForTimeout(400)
await page.click('#send')
await page.waitForTimeout(3000)
const sent = await page.evaluate(() => window.__sent)
console.log('=== 发出的消息 ===')
console.log(sent ? JSON.parse(sent).text : '(未捕获)')
console.log('toast:', await page.locator('#toast').innerText())
await browser.close(); process.exit(0)
