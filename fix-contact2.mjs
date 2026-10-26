import fs from 'node:fs'
const orders = JSON.parse(fs.readFileSync('orders-20261026-system.json','utf8'))
orders.forEach(o=>o.contact='15673820083')
fs.writeFileSync('orders-20261026-system.json', JSON.stringify(orders,null,1),'utf8')
console.log('联系方式统一填实施人手机:', orders[0].contact, '| 共', orders.length)
