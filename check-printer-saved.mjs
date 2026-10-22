import { apiPost, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'打印机卡纸', responsibleNums:['03744302'] }))
const recs = j?.data?.viewPage?.records || []
console.log('同名工单:', recs.length)
recs.forEach(r=>console.log(` [${r.code}] ${r.title} | ${r.stateView} | ${r.allLabel}`))
