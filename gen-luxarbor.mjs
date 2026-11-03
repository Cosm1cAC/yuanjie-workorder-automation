import fs from 'node:fs'
const items = JSON.parse(fs.readFileSync('erp-items.json','utf8'))
const NAME = '四川省区荣县客户Luxarbor'
const IMG = '图片/20261028-162521-97388d8ebf3e54d1c190e5a9d1d15819.jpg'
const CONTACT = '15673820083'
const orders = items.map(it=>{
  const title = `${NAME}ERP系统实施${it.item}`
  return {
    subject: title, description: title, solution: it.solution, image: IMG,
    system: '客户管家ERP', tagPath: it.labels, category: '咨询使用',
    systemType: '其他', channel: '其他', contact: CONTACT, duration: it.duration || 3,
  }
})
fs.writeFileSync('orders-20261028-luxarbor.json', JSON.stringify(orders,null,1),'utf8')
console.log(`${NAME} | ${orders.length} 单 | 联系方式 ${CONTACT}`)
console.log(orders[0].subject)
