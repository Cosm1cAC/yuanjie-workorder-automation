import fs from 'node:fs'
const all = JSON.parse(fs.readFileSync('_debug/printer-raw.json','utf8'))
const office = all.filter(r=>/办公设备/.test(r.allLabel||''))
const sub = (r)=>{ const p=(r.allLabel||'').split(','); return p[4]||'(空)' }
const tally=(rows,fn)=>{const m={};rows.forEach(r=>{const k=fn(r)||'(空)';m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])}

for (const kind of ['办公设备安装','办公设备异常处理','办公设备维修']) {
  const rows = office.filter(r=>sub(r)===kind)
  console.log(`\n=== ${kind} (${rows.length}) ===`)
  console.log(' 分类:', JSON.stringify(tally(rows,r=>r.questionTypeView).slice(0,5)))
  console.log(' 类型:', JSON.stringify(tally(rows,r=>r.systemTypeView).slice(0,5)))
  console.log(' 渠道:', JSON.stringify(tally(rows,r=>r.feedbackChannelView).slice(0,4)))
  const d=rows.map(r=>Math.round(r.handleDuration/60)).sort((a,b)=>a-b)
  console.log(' 时长中位:', d[Math.floor(d.length/2)], '分')
  console.log(' 标题样例:', rows.slice(0,4).map(r=>r.title).join(' / '))
  console.log(' 解决样例:', rows.filter(r=>r.solvePlan).slice(0,3).map(r=>r.solvePlan.replace(/\n/g,' ').slice(0,40)).join(' / '))
}
