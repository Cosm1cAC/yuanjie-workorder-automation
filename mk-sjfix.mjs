import fs from 'node:fs'
const all = JSON.parse(fs.readFileSync('orders-20261109-sanjiang.json','utf8'))
const one = all.find(o=>o.subject.endsWith('手工单创建'))
fs.writeFileSync('orders-sj-fix.json', JSON.stringify([one],null,1),'utf8')
console.log(one.subject)
