import fs from 'node:fs'
const items = JSON.parse(fs.readFileSync('erp-items.json','utf8'))
const NAME = '四川成都市三江新区客户'
const IMG = '图片/20261109-084000-93a2ec0816d4eb90c37a06576804b840.png'
const CONTACT = '18980392539'
const orders = items.map(it=>{
  const title = `${NAME}ERP系统实施${it.item}`
  return {
    subject: title, description: title, solution: it.solution, image: IMG,
    system: '客户管家ERP', tagPath: it.labels, category: '咨询使用',
    systemType: '其他', channel: '其他', contact: CONTACT, duration: it.duration || 3,
  }
})
fs.writeFileSync('orders-20261109-sanjiang.json', JSON.stringify(orders,null,1),'utf8')
console.log(`${NAME} | ${orders.length} 单 | 联系方式 ${CONTACT}`)
console.log(orders[0].subject)
