// 读取用户已在浏览器里搜好的工单列表，不导航、不刷新
import { connect, close } from './lib/browser.mjs'
import fs from 'node:fs'

const ctx = await connect()
const page = ctx.pages()[0]
await page.waitForTimeout(1000)

console.log('URL:', page.url())
console.log('TITLE:', await page.title())

// 1) 当前激活的 tab 与筛选条件
const ui = await page.evaluate(() => {
  const out = { tabs: [], inputs: [], headers: [] }
  document.querySelectorAll('[class*=tab], .com-tabs-item, .tabs li').forEach((e) => {
    const t = (e.innerText || '').trim()
    if (t && t.length < 20) {
      const cls = (e.className || '').toString()
      out.tabs.push(`${cls.includes('active') || cls.includes('selected') ? '★' : ' '} ${t}`)
    }
  })
  document.querySelectorAll('input').forEach((e) => {
    const v = (e.value || '').trim()
    const ph = e.placeholder || ''
    if (v || ph) out.inputs.push(`ph="${ph}" val="${v}"`)
  })
  document.querySelectorAll('th').forEach((e) => {
    const t = (e.innerText || '').trim()
    if (t) out.headers.push(t)
  })
  return out
})
console.log('\n=== tabs ===')
console.log([...new Set(ui.tabs)].join('\n'))
console.log('\n=== 输入框(有值或占位) ===')
console.log(ui.inputs.slice(0, 40).join('\n'))
console.log('\n=== 表头 ===')
console.log(ui.headers.join(' | '))

// 2) 表格行
const rows = await page.evaluate(() => {
  const trs = [...document.querySelectorAll('tr')].filter((tr) => tr.offsetParent !== null)
  return trs
    .map((tr) => {
      const tds = [...tr.querySelectorAll('td')].map((td) => (td.innerText || '').trim())
      return tds.length ? tds : null
    })
    .filter(Boolean)
})
console.log('\n=== 表格行数:', rows.length, '===')
for (const r of rows.slice(0, 40)) {
  console.log(r.join(' | ').replace(/\s+/g, ' ').slice(0, 260))
}

// 3) 抓当前页面的接口响应（可能已被前端缓存，重新截一次 search 请求）
const captured = []
page.on('response', async (r) => {
  if (/workOrder\/page/.test(r.url())) {
    try {
      const j = await r.json()
      captured.push(j)
      fs.writeFileSync('closed-erp.json', JSON.stringify(j, null, 1))
    } catch {}
  }
})

// 不改筛选条件，只点一次「查询」复现当前结果
const clicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button, .com-button-layout')].find((b) =>
    (b.innerText || '').trim() === '查询'
  )
  if (!btn) return false
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  return true
})
console.log('\n点击查询:', clicked)
await page.waitForTimeout(5000)
console.log('捕获接口响应:', captured.length)
if (captured.length) {
  const recs = captured[captured.length - 1]?.data?.viewPage?.records || []
  console.log('本次返回条数:', recs.length, ' 总数:', captured[captured.length - 1]?.data?.viewPage?.totalCount)
  fs.writeFileSync('closed-erp.json', JSON.stringify(captured[captured.length - 1], null, 1))
}

await close(ctx)
process.exit(0)