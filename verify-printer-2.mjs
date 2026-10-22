import { apiPost, ORDER_PAGE, apiGet } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'办公室打印机电脑连不上', responsibleNums:['03744302'] }))
const recs = j?.data?.viewPage?.records || []
console.log('找到:', recs.length)
for (const r of recs) {
  console.log(`[${r.code}] ${r.title} | ${r.stateView}`)
  console.log(`  系统=${r.belongSystemView} 分类=${r.questionTypeView} 类型=${r.systemTypeView} 渠道=${r.feedbackChannelView} 时长=${Math.round(r.handleDuration/60)}min`)
  console.log(`  标签=${r.allLabel}`)
  console.log(`  用户=${r.customerNum}/${r.customerName}`)
  console.log(`  解决=${(r.solvePlan||'').replace(/\n/g,' ')}`)
}
