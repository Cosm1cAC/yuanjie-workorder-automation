import fs from 'node:fs'
const lines = fs.readFileSync('public/index.html','utf8').split('\n')
const out = []
let inserted = false, tplDone = false
for (const ln of lines) {
  if (!inserted && ln.includes('`实施人：')) {
    out.push(ln)
    out.push("      `客户电话：${phone || '(空)'}`,")
    out.push("      `网点/位置：${$('#site').value.trim() || '(空)'}`,")
    inserted = true
    continue
  }
  if (!tplDone && ln.includes('const text = `【工单任务】')) {
    out.push("    const tplLine = '模板：' + currentTpl.name + (currentTpl.count ? '（拆 ' + currentTpl.count + ' 单）' : '')")
    out.push(ln.replace('`【工单任务】\\n', '`【工单任务】\\n${tplLine}\\n'))
    tplDone = true
    continue
  }
  out.push(ln)
}
fs.writeFileSync('public/index.html', out.join('\n'), 'utf8')
console.log('inserted meta:', inserted, '| tpl line:', tplDone)
