import { apiPost, ORDER_PAGE } from './api.mjs'
import fs from 'node:fs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'四川省区夹江客户宋倩', size:100 }))
const recs = j?.data?.viewPage?.records || []
const expected = JSON.parse(fs.readFileSync('orders-20261026-system.json','utf8'))
const have = new Set(recs.map(r=>`${r.mobileNumber}|${r.title}`))
const missing = expected.filter(o=>!have.has(`${o.contact}|${o.subject}`))
console.log('系统里:', recs.length, '| 期望:', expected.length, '| 缺失:', missing.length)
missing.forEach(o=>console.log('  ✗', o.subject))
const bad = recs.filter(r=>r.mobileNumber!=='15673820083'||r.questionTypeView!=='咨询使用'||r.systemTypeView!=='其他'||r.feedbackChannelView!=='其他'||!r.allLabel?.startsWith('客户管家ERP')||r.belongSystemView!=='客户管家ERP')
console.log('字段异常:', bad.length)
bad.slice(0,5).forEach(r=>console.log('  !', r.code, r.title, r.mobileNumber, r.questionTypeView, r.systemTypeView, r.feedbackChannelView))
const durs={}; recs.forEach(r=>{const m=Math.round(r.handleDuration/60); durs[m]=(durs[m]||0)+1})
console.log('时长分布:', JSON.stringify(durs))
console.log('编号范围:', recs.map(r=>r.code).sort()[0], '~', recs.map(r=>r.code).sort().slice(-1)[0])
