import { apiPost, ORDER_PAGE } from './api.mjs'
import fs from 'node:fs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'四川成东片区十陵蜀特客户', size:100 }))
const recs = j?.data?.viewPage?.records || []
const expected = JSON.parse(fs.readFileSync('orders-20261109-shiling.json','utf8'))
const have = new Set(recs.map(r=>`${r.mobileNumber}|${r.title}`))
const missing = expected.filter(o=>!have.has(`${o.contact}|${o.subject}`))
const bad = recs.filter(r=>r.mobileNumber!=='17364791013'||r.questionTypeView!=='咨询使用'||r.systemTypeView!=='其他'||r.feedbackChannelView!=='其他'||!r.allLabel?.startsWith('客户管家ERP')||r.belongSystemView!=='客户管家ERP')
const dup={}; recs.forEach(r=>{dup[r.title]=(dup[r.title]||0)+1})
const d=Object.entries(dup).filter(([,v])=>v>1)
const durs={}; recs.forEach(r=>{const m=Math.round(r.handleDuration/60);durs[m]=(durs[m]||0)+1})
console.log('系统里:', recs.length, '| 期望:', expected.length, '| 缺失:', missing.length)
missing.forEach(o=>console.log('  ✗', o.subject))
console.log('字段异常:', bad.length)
console.log('重复单:', d.length?JSON.stringify(d):'无')
console.log('时长:', JSON.stringify(durs))
console.log('编号:', recs.map(r=>r.code).sort()[0], '~', recs.map(r=>r.code).sort().slice(-1)[0])
