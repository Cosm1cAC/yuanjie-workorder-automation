// 扫全量工单，找重复（联系方式+标题 完全相同）
import { connect, close, BASE } from './lib/browser.mjs'
import fs from 'node:fs'

const ctx = await connect()
let page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? ctx.pages()[0]
if (!page.url().includes('/workOrder/list')) await page.goto(`${BASE}/workOrder/list`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

const API = `${BASE}/customerService/workOrder/page`
const base = {
  current: 1, size: 100, tab: '', code: '', title: '', systemName: '', labels: [], type: '',
  questionType: '', systemType: '', feedbackChannel: '', userNums: [], responsibleNums: [],
  groupIds: [], status: '', addRecord: '',
  lowerCreateTimeStamp: Date.parse('2024-01-01T00:00:00+08:00'),
  upperCreateTimeStamp: Date.parse('2026-12-31T23:59:59+08:00'),
}

const seen = new Map()
let pages = 0
for (const tab of ['', '0', '1', '2', '3']) {
  for (let cur = 1; cur <= 40; cur++) {
    const j = await page.evaluate(
      async ({ api, d }) => {
        const r = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(d),
        })
        return r.status === 200 ? r.json() : { __s: r.status }
      },
      { api: API, d: { ...base, tab, current: cur } }
    )
    if (j.__s) break
    const recs = j?.data?.viewPage?.records || []
    recs.forEach((x) => seen.set(x.code, x))
    pages++
    if (recs.length < 100) break
  }
}

const all = [...seen.values()]
console.log('扫到工单:', all.length, '（翻页请求', pages, '次）')

// 重复分组：联系方式 + 标题
const groups = new Map()
for (const r of all) {
  const k = `${r.mobileNumber || r.customerNum || ''}|${r.title}`
  if (!groups.has(k)) groups.set(k, [])
  groups.get(k).push(r)
}
const dups = [...groups.entries()].filter(([, v]) => v.length > 1)
console.log('重复组:', dups.length, '，多余条数:', dups.reduce((a, [, v]) => a + v.length - 1, 0))

const report = []
for (const [k, list] of dups) {
  list.sort((a, b) => String(a.createTime).localeCompare(String(b.createTime)))
  console.log(`\n=== 重复 ${list.length} 条: ${k.split('|')[1]}`)
  for (const r of list) {
    console.log(`   ${r.code} id=${r.id} 创建=${String(r.createTime).slice(0, 19)} 状态=${r.stateView} 处理人=${r.responsibleName || ''}`)
  }
  report.push({ key: k, items: list.map((r) => ({ code: r.code, id: r.id, createTime: r.createTime, state: r.stateView })) })
}

fs.writeFileSync('duplicates.json', JSON.stringify(report, null, 1), 'utf8')
console.log('\n明细写入 duplicates.json')
await close(ctx)
process.exit(0)
