import fs from 'node:fs'
let s = fs.readFileSync('public/index.html','utf8')

const oldMeta = "    const meta = [\n" +
"      `省区：${$('#province').value.trim()}`,\n" +
"      `片区：${$('#district').value.trim() || '(空)'}`,\n" +
"      `客户名：${$('#customer').value.trim() || '(空)'}`,\n" +
"      `标题客户名：${customerName()}`,\n" +
"      `实施人：${$('#owner').value.trim() || '四川省区黄俊浍'}`,\n" +
"    ].join('\\n')\n" +
"    const text = `【工单任务】\\n图片：\\n${list}\\n\\n${meta}\\n\\n说明：${note}`"

const newMeta = "    const meta = [\n" +
"      `省区：${$('#province').value.trim()}`,\n" +
"      `片区：${$('#district').value.trim() || '(空)'}`,\n" +
"      `客户名：${$('#customer').value.trim() || '(空)'}`,\n" +
"      `标题客户名：${customerName()}`,\n" +
"      `实施人：${$('#owner').value.trim() || '四川省区黄俊浍'}`,\n" +
"      `客户电话：${phone || '(空)'}`,\n" +
"      `网点/位置：${$('#site').value.trim() || '(空)'}`,\n" +
"    ].join('\\n')\n" +
"    const tplLine = '模板：' + currentTpl.name + (currentTpl.count ? '（拆 ' + currentTpl.count + ' 单）' : '')\n" +
"    const text = `【工单任务】\\n${tplLine}\\n图片：\\n${list}\\n\\n${meta}\\n\\n说明：${note}`"

if (!s.includes(oldMeta)) { console.log('anchor not found'); process.exit(1) }
s = s.replace(oldMeta, newMeta)
fs.writeFileSync('public/index.html', s, 'utf8')
console.log('meta patched')
