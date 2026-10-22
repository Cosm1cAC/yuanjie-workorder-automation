import { apiPost, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'打印机', responsibleNums:['03744302'], size:100 }))
const rows = j?.data?.viewPage?.records || []
console.log('本账号打印机类工单:', rows.length)
rows.slice(0,15).forEach(r=>{
  console.log(`\n[${r.code}] ${r.title} | ${r.stateView}`)
  console.log(`  分类=${r.questionTypeView} 类型=${r.systemTypeView} 渠道=${r.feedbackChannelView} 时长=${Math.round(r.handleDuration/60)}min`)
  console.log(`  标签=${r.allLabel}`)
  console.log(`  解决=${(r.solvePlan||'').replace(/\n/g,' ').slice(0,60)}`)
})
