import fs from 'node:fs'
let s = fs.readFileSync('public/index.html','utf8')
const start = s.indexOf('    const meta = [')
const endMark = "].join('\\n')"
const end = s.indexOf(endMark, start)
if (start < 0 || end < 0) { console.log('meta block not found'); process.exit(1) }
const endIdx = end + endMark.length
const oldBlock = s.slice(start, endIdx)
console.log('--- 原 meta 块 ---')
console.log(oldBlock.slice(0, 200))

const newBlock = [
  "    const owner = ($('#owner').value.trim()) || '四川省区黄俊淏'",
  "    const meta = isErp",
  "      ? [",
  "          `省区：${$('#province').value.trim()}`,",
  "          `片区：${$('#district').value.trim() || '(空)'}`,",
  "          `客户名：${$('#customer').value.trim() || '(空)'}`,",
  "          `标题客户名：${customerName()}`,",
  "          `实施人：${owner}`,",
  "          `客户电话：${phone}`,",
  "          `网点/位置：${site || '(空)'}`,",
  "        ].join('\\n')",
  "      : [`实施人：${owner}`, `网点/位置：${site}`].join('\\n')",
].join('\n')

s = s.slice(0, start) + newBlock + s.slice(endIdx)
fs.writeFileSync('public/index.html', s, 'utf8')
console.log('\n--- 已替换 ---')
