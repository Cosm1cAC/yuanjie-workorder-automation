import { connect, close, BASE } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('/workOrder')) ?? ctx.pages()[0]
const j = await page.evaluate(async (base)=>{
  const r=await fetch(`${base}/customerService/workOrder/page`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',
    body:JSON.stringify({current:1,size:100,tab:'',code:'',title:'四川省成都市双流县航空港客户',systemName:'',labels:[],type:'',questionType:'',systemType:'',feedbackChannel:'',userNums:[],responsibleNums:[],groupIds:[],status:'',addRecord:'',lowerCreateTimeStamp:Date.parse('2026-10-22T00:00:00+08:00'),upperCreateTimeStamp:Date.parse('2026-10-23T00:00:00+08:00')})})
  return await r.json()
}, BASE)
const recs=j?.data?.viewPage?.records||[]
const seen={}
recs.forEach(r=>{ const k=r.title; seen[k]=(seen[k]||[]).concat(r) })
Object.entries(seen).filter(([,v])=>v.length>1).forEach(([k,v])=>{
  console.log('重复:', k)
  v.forEach(r=>console.log(`   ${r.code} id=${r.id} 创建=${r.createTime} 状态=${r.stateView}`))
})
await close(ctx); process.exit(0)
