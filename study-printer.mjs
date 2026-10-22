// 学「打印机/设备问题」工单怎么填：拉样本、统计标题模式与标签链
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
  lowerCreateTimeStamp: Date.parse('2025-01-01T00:00:00+08:00'),
  upperCreateTimeStamp: Date.parse('2026-12-31T23:59:59+08:00'),
}

const seen = new Map()
for (const kw of ['打印', '设备', '打印机', '碳带', '标签机', '面单']) {
  for (let cur = 1; cur <= 20; cur++) {
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
      { api: API, d: { ...base, title: kw, current: cur } }
    )
    if (j.__s) break
    const recs = j?.data?.viewPage?.records || []
    recs.forEach((x) => seen.set(x.code, x))
    if (recs.length < 100) break
  }
}
const all = [...seen.values()]
console.log('打印/设备相关样本:', all.length)

// 标签链分布
const chains = {}
for (const r of all) {
  const c = r.allLabel || '(无)'
  chains[c] = chains[c] || { n: 0, ex: r.title, sys: new Set(), q: new Set(), st: new Set(), ch: new Set(), dur: new Set(), sols: [] }
  const o = chains[c]
  o.n++
  o.sys.add(r.belongSystemView)
  o.q.add(r.questionTypeView)
  o.st.add(r.systemTypeView)
  o.ch.add(r.feedbackChannelView)
  o.dur.add(Math.round((r.handleDuration || 0) / 60))
  if (o.sols.length < 3 && r.solvePlan) o.sols.push(r.solvePlan)
}
let out = `打印/设备类样本：${all.length} 条\n\n===== 标签链分布 =====\n`
Object.entries(chains)
  .sort((a, b) => b[1].n - a[1].n)
  .forEach(([c, o]) => {
    out += `\n${o.n} 条  ${c}\n`
    out += `   系统=${[...o.sys]} 分类=${[...o.q]} 类型=${[...o.st]} 渠道=${[...o.ch]} 时长=${[...o.dur].sort((a, b) => a - b).join('/')}分\n`
    out += `   例: ${o.ex}\n`
    o.sols.forEach((s) => (out += `   解决: ${s.replace(/\n/g, ' ').slice(0, 90)}\n`))
  })

// 标题里的关键词分布
const kw = {}
for (const r of all) {
  for (const k of ['打印机', '打印', '设备', '碳带', '标签', '面单', '色带', '跳页', '偏移', '模糊', '缺纸', '卡纸', '离线', '网络打印']) {
    if ((r.title || '').includes(k)) kw[k] = (kw[k] || 0) + 1
  }
}
out += `\n\n===== 标题关键词 =====\n` + Object.entries(kw).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('  ')

// 同一处理人同一天多单 -> 看拆分粒度
const byKey = {}
for (const r of all) {
  const k = `${r.responsibleName || '?'}|${(r.createTime || '').slice(0, 10)}`
  ;(byKey[k] ||= []).push(r)
}
const batches = Object.entries(byKey).filter(([, v]) => v.length >= 3).sort((a, b) => b[1].length - a[1].length)
out += `\n\n===== 批量拆分样本（同一处理人同一天 ≥3 单）=====\n`
for (const [k, v] of batches.slice(0, 6)) {
  v.sort((a, b) => String(a.createTime).localeCompare(String(b.createTime)))
  out += `\n### ${k} → ${v.length} 单\n`
  v.slice(0, 12).forEach((r) => (out += `  - ${r.title}\n      ${r.allLabel}\n`))
}

fs.writeFileSync('_debug/printer-analysis.txt', out, 'utf8')
console.log(out.slice(0, 7000))
await close(ctx)
process.exit(0)
