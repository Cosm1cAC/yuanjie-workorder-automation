// 学「安防平台 / 监控接入」工单怎么填
import { pullByTitle } from './api.mjs'
import fs from 'node:fs'

const seen = new Map()
for (const kw of ['监控接入', '接入安防', '安防平台', '监控平台', '网点监控']) {
  const rows = await pullByTitle(kw)
  rows.forEach((r) => seen.set(r.code, r))
  console.log(`"${kw}" -> ${rows.length}`)
}
const all = [...seen.values()]
console.log('去重合计:', all.length)

const tally = (rows, fn) => {
  const m = {}
  rows.forEach((r) => {
    const k = fn(r) || '(空)'
    m[k] = (m[k] || 0) + 1
  })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

const anfang = all.filter((r) => /安防平台/.test(r.allLabel || '') || /监控/.test(r.allLabel || ''))
console.log(`\n安防/监控相关: ${anfang.length}`)

console.log('\n=== 标签链分布 ===')
tally(anfang, (r) => r.allLabel).slice(0, 10).forEach(([k, v]) => console.log(`${v}  ${k}`))

for (const sub of anfang) {
  // noop
}
console.log('\n=== 按 4~6 级细分 ===')
tally(anfang, (r) => (r.allLabel || '').split(',').slice(3).join('/')).slice(0, 12).forEach(([k, v]) => console.log(`${v}  ${k}`))

console.log('\n=== 问题分类 ===', JSON.stringify(tally(anfang, (r) => r.questionTypeView).slice(0, 8)))
console.log('=== 系统类型 ===', JSON.stringify(tally(anfang, (r) => r.systemTypeView).slice(0, 8)))
console.log('=== 反馈渠道 ===', JSON.stringify(tally(anfang, (r) => r.feedbackChannelView).slice(0, 6)))
console.log('=== 处理组 ===', JSON.stringify(tally(anfang, (r) => r.groupName).slice(0, 5)))
const durs = anfang.map((r) => Math.round((r.handleDuration || 0) / 60)).sort((a, b) => a - b)
console.log('=== 时长中位:', durs[Math.floor(durs.length / 2)], '分 ===', JSON.stringify(tally(anfang, (r) => Math.round((r.handleDuration || 0) / 60)).slice(0, 8)))

console.log('\n=== 标题样例（接入相关）===')
anfang
  .filter((r) => /接入|上线|联网|配置/.test(r.title || ''))
  .slice(0, 20)
  .forEach((r) => console.log(`  ${r.title}`))

console.log('\n=== 解决办法样例 ===')
anfang
  .filter((r) => /接入|上线|配置/.test(r.title || '') && r.solvePlan)
  .slice(0, 10)
  .forEach((r) => console.log(`  ${r.title}\n    → ${r.solvePlan.replace(/\n/g, ' ').slice(0, 80)}`))

fs.writeFileSync('_debug/anfang-sample.json', JSON.stringify(anfang, null, 1), 'utf8')
console.log(`\n已存 _debug/anfang-sample.json（${anfang.length} 条）`)
