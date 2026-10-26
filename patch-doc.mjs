import fs from 'node:fs'
let f = fs.readFileSync('.opencode/skills/yuanjie-erp-workorder/references/ops.md','utf8')
f = f.replace(
`- 录单时窗口移到屏幕外（\`left:-2400\`），不抢焦点`,
`- 录单时窗口临时移到屏幕外（\`left:-2400\`），不抢焦点，**跑完自动归位到 (120,60) 1600x960**
  - 加 \`--show\` 就不挪窗口，可以全程盯着看
  - 万一被留在屏幕外，跑 \`node restore-window.mjs\` 立即找回`)
fs.writeFileSync('.opencode/skills/yuanjie-erp-workorder/references/ops.md', f, 'utf8')
console.log('doc updated')
