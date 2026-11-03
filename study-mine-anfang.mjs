import { apiPost, ORDER_PAGE } from './api.mjs'
for (const kw of ['监控接入','安防平台','监控']) {
  const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title: kw, responsibleNums:['03744302'], size:100 }))
  const recs = j?.data?.viewPage?.records || []
  console.log(`\n"${kw}" 本账号: ${recs.length}`)
  recs.slice(0,6).forEach(r=>{
    console.log(`[${r.code}] ${r.title}`)
    console.log(`  分类=${r.questionTypeView} 类型=${r.systemTypeView} 渠道=${r.feedbackChannelView} 时长=${Math.round(r.handleDuration/60)}min 系统=${r.belongSystemView}`)
    console.log(`  标签=${r.allLabel}`)
    console.log(`  解决=${(r.solvePlan||'').replace(/\n/g,' ').slice(0,60)}`)
  })
}
