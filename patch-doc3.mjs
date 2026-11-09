import fs from 'node:fs'
let s = fs.readFileSync('图片上传说明.md','utf8')
s = s.replace(
`   选中后会显示该模板的拆单提示和说明示例；ERP 类模板会强制要求填客户电话。`,
`   选中后会显示该模板的拆单提示和说明示例。

   **表单会跟着模板变：**
   - ERP 三类：显示省区*、片区、客户名、客户电话*、网点/位置、标题客户名预览
   - 非 ERP（打印机/网络/安防/自定义）：把 ERP 那套收起来，只留 **实施人** 和 **网点/位置***
   - 发的消息也只带对应字段，不会塞一堆用不上的 ERP 信息`)
fs.writeFileSync('图片上传说明.md', s, 'utf8')
console.log('doc updated')
