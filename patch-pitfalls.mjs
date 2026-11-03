import fs from 'node:fs'
let f = fs.readFileSync('.opencode/skills/yuanjie-erp-workorder/references/form-pitfalls.md','utf8')
f = f.replace(
`## 12. 工单删不掉`,
`## 12. 标签树“点完不生效” = 还没点到叶子

- 安防平台链有 6 级，第 5、6 级同名（\`监控接入安防平台\`）
- 只点到第 5 级时：标签栏空白、容器带 \`input-invalid\`、保存时校验不过
- 修法：继续点第 6 列，标签立刻落上
- 通用排查：点完最后一级看标签栏是否为空，空就说明还有下一列

## 13. 工单删不掉`)
fs.writeFileSync('.opencode/skills/yuanjie-erp-workorder/references/form-pitfalls.md', f, 'utf8')
console.log('pitfalls updated')
