import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')
const old = `          lowerCreateTimeStamp: Date.parse('2026-10-22T00:00:00+08:00'),
          upperCreateTimeStamp: Date.parse('2026-10-24T00:00:00+08:00'),`
const neu = `          lowerCreateTimeStamp: Date.now() - 7 * 24 * 3600 * 1000,
          upperCreateTimeStamp: Date.now() + 24 * 3600 * 1000,`
if (!s.includes(old)) { console.log('未找到硬编码日期，检查实际内容'); process.exit(1) }
s = s.replace(old, neu)
fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('已改为动态时间范围（近7天~明天）')
