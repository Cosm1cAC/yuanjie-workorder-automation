import { apiPost, ORDER_PAGE } from './api.mjs'
import fs from 'node:fs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'四川省区荣县客户Luxarbor', size:100 }))
const recs = j?.data?.viewPage?.records || []
const expected = JSON.parse(fs.readFileSync('orders-20261028-luxarbor.json','utf8'))
const have = new Set(recs.map(r=>`${r.title}`))
const missing = expected.filter(o=>!have.has(o.subject))
const phones={}; recs.forEach(r=>{phones[r.mobileNumber]=(phones[r.mobileNumber]||0)+1})
const bad = recs.filter(r=>r.mobileNumber!=='18828892558'||r.questionTypeView!=='咨询使用'||r.systemTypeView!=='其他'||r.feedbackChannelView!=='其他'||!r.allLabel?.startsWith('客户管家ERP')||r.belongSystemView!=='客户管家ERP')
console.log('系统里:', recs.length, '| 期望:', expected.length, '| 缺失:', missing.length)
console.log('联系方式:', JSON.stringify(phones))
console.log('字段异常:', bad.length)
const dup={}; recs.forEach(r=>{dup[r.title]=(dup[r.title]||0)+1})
const d=Object.entries(dup).filter(([,v])=>v>1)
console.log('重复单:', d.length?JSON.stringify(d):'无')
const durs={}; recs.forEach(r=>{const m=Math.round(r.handleDuration/60);durs[m]=(durs[m]||0)+1})
console.log('时长:', JSON.stringify(durs))
console.log('编号:', recs.map(r=>r.code).sort()[0], '~', recs.map(r=>r.code).sort().slice(-1)[0])
