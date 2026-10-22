// 只拉一次「打印机」，缓存后分析
import { pullByTitle } from './api.mjs'
import fs from 'node:fs'

const CACHE = '_debug/printer-raw.json'
let all
if (fs.existsSync(CACHE)) {
  all = JSON.parse(fs.readFileSync(CACHE, 'utf8'))
  console.log('读缓存:', all.length)
} else {
  all = await pullByTitle('打印机')
  fs.writeFileSync(CACHE, JSON.stringify(all, null, 1), 'utf8')
  console.log('拉取并缓存:', all.length)
}

const tally = (rows, fn) => {
  const m = {}
  rows.forEach((r) => {
    const k = fn(r) || '(空)'
    m[k] = (m[k] || 0) + 1
  })
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}

const office = all.filter((r) => /办公设备/.test(r.allLabel || ''))
console.log(`\n走「办公设备」链: ${office.length}`)

console.log('\n=== 标签链分布 ===')
tally(office, (r) => r.allLabel).slice(0, 8).forEach(([k, v]) => console.log(`${v}  ${k}`))

console.log('\n=== 问题分类 ===', JSON.stringify(tally(office, (r) => r.questionTypeView)))
console.log('=== 系统类型 ===', JSON.stringify(tally(office, (r) => r.systemTypeView)))
console.log('=== 反馈渠道 ===', JSON.stringify(tally(office, (r) => r.feedbackChannelView)))
console.log('=== 处理组 ===', JSON.stringify(tally(office, (r) => r.groupName)))
const durs = office.map((r) => Math.round((r.handleDuration || 0) / 60)).sort((a, b) => a - b)
console.log('=== 时长中位数', durs[Math.floor(durs.length / 2)], '分 ===', JSON.stringify(tally(office, (r) => Math.round((r.handleDuration || 0) / 60)).slice(0, 8)))

console.log('\n=== 标题样例 ===')
office
  .slice()
  .sort((a, b) => (a.title || '').length - (b.title || '').length)
  .filter((_, i) => i % Math.max(1, Math.floor(office.length / 20)) === 0)
  .slice(0, 20)
  .forEach((r) => console.log(`  [${(r.title || '').length}字] ${r.title}`))

console.log('\n=== 解决办法高频词 ===')
const sol = {}
office.forEach((r) => {
  const s = r.solvePlan || ''
  for (const w of ['重装驱动', '安装驱动', '更换硒鼓', '更换', '远程', '重启', '网络', '连接', '设置', '已处理', '讲解', '培训', '报修', '上门', '驱动']) {
    if (s.includes(w)) sol[w] = (sol[w] || 0) + 1
  }
})
console.log(JSON.stringify(Object.entries(sol).sort((a, b) => b[1] - a[1])))

console.log('\n=== 同人同日 ≥3 单 ===')
const byKey = {}
office.forEach((r) => {
  const k = `${r.responsibleName || '?'}|${(r.createTime || '').slice(0, 10)}`
  ;(byKey[k] ||= []).push(r)
})
Object.entries(byKey)
  .filter(([, v]) => v.length >= 3)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 3)
  .forEach(([k, v]) => {
    console.log(`\n### ${k} → ${v.length} 单`)
    v.slice(0, 8).forEach((r) => console.log(`  - ${r.title}`))
  })
