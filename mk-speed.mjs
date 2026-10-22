import fs from 'node:fs'
const orders = JSON.parse(fs.readFileSync('orders-printer-2.json','utf8'))
orders[0].subject = '测速用-请勿保存'
fs.writeFileSync('orders-speedtest.json', JSON.stringify(orders,null,1),'utf8')
console.log('ok')
