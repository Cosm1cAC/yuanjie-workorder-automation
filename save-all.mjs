// 把剩余已填好的工单逐单保存，保存后关闭标签页
import { connect, close } from './lib/browser.mjs'

const ctx = await connect()
const savedLog = []

const isAdd = (p) => p.url().includes('/workOrder/add')

let pages = ctx.pages().filter(isAdd)
console.log('待处理标签页:', pages.length)

for (const p of pages) {
  let subject = ''
  try {
    subject = (await p.evaluate(() => (document.querySelectorAll('.com-textarea-element')[0]?.value || '').trim())) || ''
  } catch {}

  if (!subject) {
    console.log('空表单，直接关掉')
    await p.close().catch(() => {})
    continue
  }

  try {
    await p.evaluate(() => {
      const b = [...document.querySelectorAll('button,.com-button-layout')].find(
        (x) => (x.innerText || '').trim() === '保存工单'
      )
      b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    })

    // 保存成功后应用会跳离新增页
    const t0 = Date.now()
    while (Date.now() - t0 < 20000) {
      await p.waitForTimeout(700)
      if (!p.url().includes('/workOrder/add')) break
    }

    const ok = !p.url().includes('/workOrder/add')
    console.log(`${ok ? '✓' : '✗'} ${subject}`)
    savedLog.push({ subject, ok })

    if (ok) {
      await p.waitForTimeout(800)
      await p.close().catch(() => {})
    }
  } catch (e) {
    console.log(`✗ ${subject} | ${String(e.message).slice(0, 80)}`)
    savedLog.push({ subject, ok: false })
  }
}

console.log('\n保存成功:', savedLog.filter((s) => s.ok).length, '/', savedLog.length)
console.log('剩余标签页:', ctx.pages().length)
await close(ctx)
process.exit(0)