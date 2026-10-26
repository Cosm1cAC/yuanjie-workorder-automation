import { apiPost, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'四川省区夹江客户宋倩', size:100 }))
const recs = j?.data?.viewPage?.records || []
console.log('最终记录数:', recs.length, '（其中 1 条是重复）')
console.log('样例:')
recs.slice(0,3).forEach(r=>console.log(`  [${r.code}] ${r.title} | ${r.belongSystemView}/${r.questionTypeView}/${r.systemTypeView}/${r.feedbackChannelView} | ${Math.round(r.handleDuration/60)}min | ${r.mobileNumber}`))
