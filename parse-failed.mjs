import fs from 'node:fs'
const lines = fs.readFileSync('batch89.log','utf8').split(/\r?\n/)
let cur = null
const failed = []
for (const ln of lines) {
  const m = ln.match(/^===\s*(\d+)\/(\d+)/)
  if (m) { cur = Number(m[1]); continue }
  if (cur && /保存未跳转|出错|有字段未填成功/.test(ln)) {
    if (!failed.includes(cur)) failed.push(cur)
  }
}
const orders = JSON.parse(fs.readFileSync('orders-20261022-4shop.json','utf8'))
const retry = failed.map(i => orders[i-1])
fs.writeFileSync('orders-20261022-4shop-retry.json', JSON.stringify(retry,null,1),'utf8')
console.log('失败单序号:', failed.join(','))
console.log('待重跑:', retry.length)
retry.forEach(o=>console.log('  ', o.contact, o.subject))
