import fs from 'node:fs'
const orders = JSON.parse(fs.readFileSync('orders-speedtest.json','utf8'))
orders[0].contact='03744302'
// 用一个已存在标题避免真保存
orders[0].subject='四川省区夹江客户宋倩ERP系统实施订单审核'
orders[0].description=orders[0].subject
fs.writeFileSync('orders-wintest.json', JSON.stringify(orders,null,1),'utf8')
console.log('ok')
