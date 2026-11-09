import { apiPost, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'达州宣汉县网点818003', responsibleNums:['03744302'], size:10 }))
const recs = j?.data?.viewPage?.records || []
console.log('找到:', recs.length)
recs.forEach(r=>{
  console.log(`[${r.code}] ${r.title} | ${r.stateView}`)
  console.log(`  系统=${r.belongSystemView} 分类=${r.questionTypeView} 类型=${r.systemTypeView} 渠道=${r.feedbackChannelView} 时长=${Math.round(r.handleDuration/60)}min`)
  console.log(`  标签=${r.allLabel}`)
  console.log(`  描述=${(r.content||'').replace(/\n/g,' ')}`)
  console.log(`  解决=${(r.solvePlan||'').replace(/\n/g,' ')}`)
})
