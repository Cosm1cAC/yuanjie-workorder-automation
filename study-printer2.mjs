// 打印机/设备类工单：字段分布 + 标签树里的打印设备链路
import { connect, close, BASE } from './lib/browser.mjs'
import fs from 'node:fs'

const ctx = await connect()
let page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? ctx.pages()[0]
await page.goto(`${BASE}/workOrder/add`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)

// ---------- 1) 标签树：IT类设备 下面有什么 -----------------
const W_TAG = 7
async function openTag() {
  const el = page.locator('.label-wrapper').nth(W_TAG).locator('input.com-input-element').first()
  const b = await el.boundingBox()
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
  await page.waitForTimeout(1200)
}
async function clickLevel(text, level) {
  for (let t = 0; t < 6; t++) {
    const r = await page.evaluate(
      ({ txt, lv }) => {
        const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
        const col = cols[lv] || cols[cols.length - 1]
        if (!col) return null
        const items = [...col.querySelectorAll('li.com-tree-flat-li')]
        const el = items.find((x) => (x.textContent || '').trim() === txt)
        if (!el) return { missing: true, head: items.slice(0, 12).map((x) => x.textContent.trim()) }
        el.scrollIntoView({ block: 'center' })
        const b = el.getBoundingClientRect()
        return { x: b.x, y: b.y, w: b.width, h: b.height }
      },
      { txt: text, lv: level }
    )
    if (!r) {
      await page.waitForTimeout(250)
      continue
    }
    if (r.missing) return r
    await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2)
    await page.waitForTimeout(350)
    return { ok: true }
  }
  return { fail: true }
}

await openTag()
console.log('打开标签树成功:', await page.evaluate(() => [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null).length))
for (const [lv, name] of ['自动化&IT管理-2026', '自动化技术支持-工单类', 'IT类设备'].entries()) {
  const r = await clickLevel(name, lv)
  console.log(`L${lv + 1} ${name}:`, JSON.stringify(r).slice(0, 200))
}
// 第 4 级选项
const level4 = await page.evaluate(() => {
  const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
  const col = cols[3] || cols[cols.length - 1]
  return col ? [...col.querySelectorAll('li.com-tree-flat-li')].map((x) => x.textContent.trim()) : []
})
console.log('\nIT类设备 下一级:', level4.join(' / '))

// 如果第4级有“打印设备/办公设备”，点进去看第5、6级
const target4 = level4.find((x) => /打印|办公设备|电脑/.test(x))
if (target4) {
  const r = await clickLevel(target4, 3)
  console.log(`\nL4 ${target4}:`, JSON.stringify(r).slice(0, 120))
  const level5 = await page.evaluate(() => {
    const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
    const col = cols[4] || cols[cols.length - 1]
    return col ? [...col.querySelectorAll('li.com-tree-flat-li')].map((x) => x.textContent.trim()) : []
  })
  console.log(`L4 ${target4} 下一级:`, level5.join(' / '))
  const target5 = level5.find((x) => /打印|故障|异常/.test(x))
  if (target5) {
    await clickLevel(target5, 4)
    const level6 = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
      const col = cols[5] || cols[cols.length - 1]
      return col ? [...col.querySelectorAll('li.com-tree-flat-li')].map((x) => x.textContent.trim()) : []
    })
    console.log(`L5 ${target5} 下一级:`, level6.join(' / '))
  }
}

// ---------- 2) 字段分布：办公设备相关 -----------------
await page.keyboard.press('Escape')

const API = `${BASE}/customerService/workOrder/page`
const base = {
  current: 1, size: 100, tab: '', code: '', title: '', systemName: '', labels: [], type: '',
  questionType: '', systemType: '', feedbackChannel: '', userNums: [], responsibleNums: [],
  groupIds: [], status: '', addRecord: '',
  lowerCreateTimeStamp: Date.parse('2025-01-01T00:00:00+08:00'),
  upperCreateTimeStamp: Date.parse('2026-12-31T23:59:59+08:00'),
}
const seen = new Map()
for (const kw of ['打印', '打印机', '设备']) {
  for (let cur = 1; cur <= 25; cur++) {
    const j = await page.evaluate(
      async ({ api, d }) => {
        const r = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(d) })
        return r.status === 200 ? r.json() : { __s: r.status }
      },
      { api: API, d: { ...base, title: kw, current: cur } }
    )
    if (j.__s) break
    const recs = j?.data?.viewPage?.records || []
    recs.forEach((x) => seen.set(x.code, x))
    if (recs.length < 100) break
  }
}
const all = [...seen.values()]
const office = all.filter((r) => /办公设备/.test(r.allLabel || ''))
console.log(`\n样本 ${all.length}，其中走「办公设备」链的 ${office.length}`)

const tally = (rows, fn) => {
  const m = {}
  rows.forEach((r) => {
    const k = fn(r) || '(空)'
    m[k] = (m[k] || 0) + 1
  })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}
console.log('问题分类:', JSON.stringify(tally(office, (r) => r.questionTypeView)))
console.log('系统类型:', JSON.stringify(tally(office, (r) => r.systemTypeView)))
console.log('反馈渠道:', JSON.stringify(tally(office, (r) => r.feedbackChannelView)))
console.log('处理组:', JSON.stringify(tally(office, (r) => r.groupName)))
const durs = office.map((r) => Math.round((r.handleDuration || 0) / 60)).sort((a, b) => a - b)
console.log('时长中位数:', durs[Math.floor(durs.length / 2)], '分 | 常见:', JSON.stringify(tally(office, (r) => Math.round((r.handleDuration || 0) / 60)).slice(0, 8)))

// 按 4~6 级细分
const sub = {}
office.forEach((r) => {
  const parts = (r.allLabel || '').split(',')
  const k = parts.slice(3).join('/') || '(空)'
  sub[k] = (sub[k] || 0) + 1
})
console.log('\n办公设备下细分链:')
Object.entries(sub).sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => console.log(`  ${v}  ${k}`))

fs.writeFileSync('_debug/printer-sample.json', JSON.stringify(office, null, 1), 'utf8')
console.log('\n样本已存 _debug/printer-sample.json')

await close(ctx)
process.exit(0)
