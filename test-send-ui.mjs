// 在上传页上模拟一次「发送给 AI」，抓响应
import { connect, close } from './lib/browser.mjs'

const ctx = await connect()
const page = ctx.pages().find((p) => p.url().includes('127.0.0.1:8787'))
if (!page) {
  console.log('上传页没开')
  process.exit(1)
}
await page.bringToFront()

const net = []
page.on('response', async (r) => {
  if (r.url().includes('/api/send')) {
    let body = ''
    try {
      body = (await r.text()).slice(0, 300)
    } catch {}
    net.push(`${r.status()} ${r.url()} :: ${body}`)
  }
})
const errs = []
page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 150)))
page.on('console', (m) => {
  if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 150))
})

// 造一张图放进暂存
await page.evaluate(async () => {
  const blob = await (await fetch('/logo.png')).blob()
  const file = new File([blob], '连通性测试.png', { type: 'image/png' })
  const dt = new DataTransfer()
  dt.items.add(file)
  document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
})
await page.waitForTimeout(400)
await page.selectOption('#province', '四川省区')
await page.fill('#note', '连通性测试，请忽略')
await page.waitForTimeout(200)

console.log('暂存数:', await page.locator('.stage').count())
console.log('按钮 disabled:', await page.locator('#send').isDisabled())

await page.click('#send')
await page.waitForTimeout(6000)

console.log('toast:', await page.locator('#toast').innerText())
console.log('网络:', net.join('\n') || '(无 /api/send 请求)')
console.log('错误:', errs.join(' | ') || '(无)')
console.log('暂存数(发送后):', await page.locator('.stage').count())

await close(ctx)
process.exit(0)
