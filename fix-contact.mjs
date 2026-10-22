import fs from 'node:fs'
const orders = JSON.parse(fs.readFileSync('orders-printer-1.json','utf8'))
orders[0].contact = orders[0].user
delete orders[0].user
fs.writeFileSync('orders-printer-1.json', JSON.stringify(orders,null,1),'utf8')
console.log(Object.keys(orders[0]).join(','), '| contact=', orders[0].contact)
