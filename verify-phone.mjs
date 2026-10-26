import { apiPost, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'四川省区夹江客户宋倩', size:100 }))
const recs = j?.data?.viewPage?.records || []
const phones = {}
recs.forEach(r=>{ phones[r.mobileNumber]=(phones[r.mobileNumber]||0)+1 })
console.log('共', recs.length, '单 | 联系方式分布:', JSON.stringify(phones))
const bad = recs.filter(r=>r.mobileNumber!=='15391580087')
console.log('未更新:', bad.length)
bad.slice(0,5).forEach(r=>console.log('  ', r.code, r.mobileNumber))
