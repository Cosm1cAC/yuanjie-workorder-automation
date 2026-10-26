import { apiPost, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'四川省区夹江客户宋倩', size:100 }))
const recs = j?.data?.viewPage?.records || []
const g={}
recs.forEach(r=>{ (g[r.title]=g[r.title]||[]).push(r) })
Object.entries(g).filter(([,v])=>v.length>1).forEach(([t,v])=>{
  console.log('重复:', t)
  v.sort((a,b)=>String(a.createTime).localeCompare(String(b.createTime))).forEach(r=>console.log(`   ${r.code} id=${r.id} ${String(r.createTime).slice(11,19)}`))
})
