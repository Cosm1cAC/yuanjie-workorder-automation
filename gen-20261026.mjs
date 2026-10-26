import fs from 'node:fs'
const items = JSON.parse(fs.readFileSync('erp-items.json','utf8'))
const NAME = '四川省区夹江客户宋倩'
const IMG = '图片/20261026-111217-245932994c4e6178f6919bb01371e933.png'
const orders = items.map(it=>{
  const title = `${NAME}ERP系统实施${it.item}`
  return {
    subject: title, description: title, solution: it.solution, image: IMG,
    system: '客户管家ERP', tagPath: it.labels, category: '咨询使用',
    systemType: '其他', channel: '其他', contact: '', duration: it.duration || 3,
  }
})
fs.writeFileSync('orders-20261026-system.json', JSON.stringify(orders,null,1),'utf8')
console.log(`${NAME} | ${orders.length} 单 | 联系方式留空（先试）`)
console.log(orders[0].subject)
