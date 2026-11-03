import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')
s = s.replace(
`  if (!Array.isArray(o.tagPath) || o.tagPath.length !== 6) miss.push('tagPath(必须6级)')`,
`  if (!Array.isArray(o.tagPath) || o.tagPath.length < 4) miss.push('tagPath(至少4级)')`)
fs.writeFileSync('erp-batch.mjs', s, 'utf8')

const orders = [{
  subject: '德阳罗江网点监控接入安防平台',
  description: '川-德阳-圆通-罗江网点视频监控接入安防平台，平台显示 16 个监控点全部在线，在线率 100%。',
  solution: '已接入安防平台，16 个监控点全部在线，在线率 100%。',
  image: '图片/20261103-091902-image.png',
  system: '安防平台',
  tagPath: ['安防平台', '网点监控', '网点监控配置', 'OSD需接入安防平台', '监控接入安防平台'],
  category: '咨询使用',
  systemType: '设备类',
  channel: '微信',
  contact: '03744302',
  duration: 30,
}]
fs.writeFileSync('orders-20261103-anfang.json', JSON.stringify(orders,null,1),'utf8')
console.log('ok:', orders[0].subject)
console.log(orders[0].tagPath.join(' / '))
