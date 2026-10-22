import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')

// 选完标签后等表单重建
s = s.replace(
`  const okSystem = await pick(W.system, o.system, '所属系统')
  const okTag = o.tagPath?.length ? await pickTag(o.tagPath) : true`,
`  const okSystem = await pick(W.system, o.system, '所属系统')
  const okTag = o.tagPath?.length ? await pickTag(o.tagPath) : true
  // 换标签会触发工单信息区重建，等它稳定再填后面的字段
  if (okTag) await page.waitForTimeout(2200)`)

// 全部填完后做一轮校验补填
s = s.replace(
`  const okContact = o.contact ? await fillContact(o.contact) : true

  return okSystem && okTag && okCat && okType && okCh && okContact`,
`  // 校验补填：重建可能把前面的字段清掉
  const want = [
    [W.system, o.system, '所属系统'],
    [W.category, o.category, '问题分类'],
    [W.sysType, o.systemType, '系统类型'],
    [W.channel, o.channel, '反馈渠道'],
  ]
  for (let round = 0; round < 2; round++) {
    for (const [idx, val, label] of want) {
      if (!val) continue
      const txt = await fieldText(idx)
      if (!txt.includes(val)) {
        console.log(\`   [fix] \${label} 被清空，重填\`)
        await pick(idx, val, label)
      }
    }
  }

  const okContact = o.contact ? await fillContact(o.contact) : true

  return okSystem && okTag && okCat && okType && okCh && okContact`)

fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('ok')
