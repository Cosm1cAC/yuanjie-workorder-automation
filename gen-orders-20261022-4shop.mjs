import fs from 'node:fs'

const sysItems = JSON.parse(fs.readFileSync('erp-items.json', 'utf8'))
const platItems = JSON.parse(fs.readFileSync('platform-items.json', 'utf8'))
const IMG = '图片/示例截图.png'

// 图中四家：前三家系统模式，最后一家平台模式
// 示例结构（真实数据请勿入库，图片目录也已在 .gitignore 中）
const customers = [
  { account: '13900000000', site: '某某市某县网点', mode: 'system' },
  { account: '13900000001', site: '某某市某县网点', mode: 'system' },
  { account: '13900000002', site: '某某市某县网点', mode: 'system' },
  { account: '13900000003', site: '某某市某县网点', mode: 'platform' },
]

const orders = []
for (const c of customers) {
  const name = `${c.site}客户`
  if (c.mode === 'system') {
    for (const it of sysItems) {
      const title = `${name}ERP系统实施${it.item}`
      orders.push({
        subject: title,
        description: title,
        solution: it.solution,
        image: IMG,
        system: '客户管家ERP',
        tagPath: it.labels,
        category: '咨询使用',
        systemType: '其他',
        channel: '其他',
        contact: c.account,
        duration: it.duration || 3,
      })
    }
  } else {
    const items = platItems.items.filter((i) => i.required || i.item === '设置审单策略')
    for (const it of items) {
      const title = `${name}erp对接-平台模式-${it.item}`
      orders.push({
        subject: title,
        description: title,
        solution: it.solution,
        image: IMG,
        system: '客户管家ERP',
        tagPath: platItems.fields.labels,
        category: '咨询使用',
        systemType: 'WEB端',
        channel: '微信',
        contact: c.account,
        duration: it.duration || 10,
      })
    }
  }
}

fs.writeFileSync('orders-20261022-4shop.json', JSON.stringify(orders, null, 1), 'utf8')
console.log(`共 ${orders.length} 单`)
const stat = {}
orders.forEach((o) => {
  const k = `${o.contact} ${o.subject.split('客户')[0]}客户`
  stat[k] = (stat[k] || 0) + 1
})
console.log(stat)
console.log('\n样例:')
orders.slice(0, 2).concat(orders.slice(27, 29)).concat(orders.slice(81, 83)).forEach((o) =>
  console.log(` ${o.contact} | ${o.subject}`)
)