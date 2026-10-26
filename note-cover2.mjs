import fs from 'node:fs'
let p = fs.readFileSync('待处理-重复单.md','utf8')
p = p.replace('| G20261026000257 | 宋倩ERP系统实施订单审核 | ⬜ **待覆盖**（下一单补） |',
`| G20261026000257 | 宋倩ERP系统实施订单审核 | ✅ 已用川南片区绵竹客户 27 单覆盖 |`)
fs.writeFileSync('待处理-重复单.md', p, 'utf8')
console.log('覆盖状态已更新')
