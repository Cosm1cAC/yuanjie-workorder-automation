import { connect, close, BASE } from './lib/browser.mjs'

const ctx = await connect()
let page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? ctx.pages()[0]
await page.goto(`${BASE}/workOrder/list`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)

// 点“已关闭”
const tabBox = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && (e.innerText || '').trim() === '已关闭')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
if (tabBox) {
  await page.mouse.click(tabBox.x + tabBox.w / 2, tabBox.y + tabBox.h / 2)
  await page.waitForTimeout(3000)
}

const firstRow = await page.evaluate(() => {
  const trs = [...document.querySelectorAll('tr')].filter((t) => t.querySelectorAll('td').length > 3)
  const tr = trs[trs.length - 1] || trs[0]
  if (!tr) return 'no row'
  const tds = [...tr.querySelectorAll('td')]
  const last = tds[tds.length - 1]
  return JSON.stringify(
    {
      code: tr.innerText.slice(0, 30).replace(/\n/g, ' '),
      cellCount: tds.length,
      lastCellHtml: (last?.innerHTML || '').slice(0, 900),
    },
    null,
    1
  )
})
console.log('=== 列表行最后一列（操作列）===')
console.log(firstRow)

// 页面内所有带删除/作废字样的元素
console.log('\n=== 页面内 删除/作废/关闭 相关文本 ===')
console.log(
  await page.evaluate(() => {
    const hits = []
    document.querySelectorAll('*').forEach((e) => {
      const t = (e.innerText || '').trim()
      if (e.children.length === 0 && /删除|作废|关闭工单|撤回/.test(t) && t.length < 12) {
        hits.push(`${e.tagName}."${(e.className || '').toString().slice(0, 50)}" :: ${t}`)
      }
    })
    return [...new Set(hits)].slice(0, 12).join('\n') || 'none'
  })
)

// 详情页的“修改”里有没有删除
const other = ctx.pages().find((p) => p.url().includes('/workOrder/detail'))
if (other) {
  await other.evaluate(() => {
    const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '修改')
    b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  await other.waitForTimeout(2500)
  console.log('\n=== 修改面板里的按钮 ===')
  console.log(
    await other.evaluate(() =>
      [...document.querySelectorAll('button,.com-button-layout')].map((b) => (b.innerText || '').trim()).filter(Boolean).join(' | ')
    )
  )
}

await close(ctx)
process.exit(0)
