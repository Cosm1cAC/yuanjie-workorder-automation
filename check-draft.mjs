import { connect, close, BASE } from './lib/browser.mjs'
const ctx = await connect()
let page = ctx.pages().find(p=>p.url().includes('/workOrder')) ?? ctx.pages()[0]
if (!page.url().includes('/workOrder/list')) await page.goto(`${BASE}/workOrder/list`,{waitUntil:'domcontentloaded'})
await page.waitForTimeout(3000)
const j = await page.evaluate(async (base)=>{
  const out={}
  for (const st of ['草稿','draft','']) {
    const r=await fetch(`${base}/customerService/workOrder/page`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',
      body:JSON.stringify({current:1,size:20,tab:'3',code:'',title:'',systemName:'',labels:[],type:'',questionType:'',systemType:'',feedbackChannel:'',userNums:[],responsibleNums:[],groupIds:[],status:st,addRecord:'',lowerCreateTimeStamp:Date.parse('2024-01-01T00:00:00+08:00'),upperCreateTimeStamp:Date.parse('2026-12-31T23:59:59+08:00')})})
    const d=await r.json()
    out[st||'(空)']=(d?.data?.viewPage?.records||[]).map(x=>({code:x.code,id:x.id,title:x.title,state:x.stateView,creator:x.createNum}))
  }
  return out
}, BASE)
console.log(JSON.stringify(j,null,1).slice(0,2000))
await close(ctx); process.exit(0)
