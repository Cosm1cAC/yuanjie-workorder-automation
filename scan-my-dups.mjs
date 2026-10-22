// 只看本账号(03744302/黄俊浍)录入的工单，找重复
import { connect, close, BASE } from './lib/browser.mjs'
import fs from 'node:fs'

const ctx = await connect()
let page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? ctx.pages()[0]
if (!page.url().includes('/workOrder/list')) await page.goto(`${BASE}/workOrder/list`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

const API = `${BASE}/customerService/workOrder/page`
const base = {
  current: 1, size: 100, tab: '', code: '', title: '', systemName: '', labels: [], type: '',
  questionType: '', systemType: '', feedbackChannel: '', userNums: [], responsibleNums: ['03744302'],
  groupIds: [], status: '', addRecord: '',
  lowerCreateTimeStamp: Date.parse('2024-01-01T00:00:00+08:00'),
  upperCreateTimeStamp: Date.parse('2026-12-31T23:59:59+08:00'),
}

const seen = new Map()
for (const tab of ['', '0', '1', '2', '3']) {
  for (let cur = 1; cur <= 30; cur++) {
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
    if (recs.length < 100) break
  }
}

const all = [...seen.values()]
console.log('本账号工单总数:', all.length)

// 严格重复：标题 + 联系方式 + 问题描述 都一致
const groups = new Map()
for (const r of all) {
  const k = `${r.title}|${r.mobileNumber || ''}|${(r.content || '').trim()}`
  if (!groups.has(k)) groups.set(k, [])
  groups.get(k).push(r)
}
const dups = [...groups.entries()].filter(([, v]) => v.length > 1)
console.log('严格重复组:', dups.length, '，多余条数:', dups.reduce((a, [, v]) => a + v.length - 1, 0))

const out = []
for (const [k, list] of dups) {
  list.sort((a, b) => String(a.createTime).localeCompare(String(b.createTime)))
  const [title, mobile] = k.split('|')
  console.log(`\n=== ${list.length} 条 | ${title} | 联系方式=${mobile || '(空)'}`)
  list.forEach((r) => console.log(`   ${r.code} id=${r.id} 创建=${String(r.createTime).slice(0, 19)} 状态=${r.stateView}`))
  out.push({ title, mobile, items: list.map((r) => ({ code: r.code, id: r.id, createTime: r.createTime, state: r.stateView })) })
}
fs.writeFileSync('my-duplicates.json', JSON.stringify(out, null, 1), 'utf8')
console.log('\n写入 my-duplicates.json')
await close(ctx)
process.exit(0)
