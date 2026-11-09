import fs from 'node:fs'
let s = fs.readFileSync('public/index.html','utf8')
const startMark = "  const province = $('#province')\n"
const endMark = "  phoneEl.classList.remove('invalid')\n"
const start = s.indexOf(startMark)
const end = s.indexOf(endMark, start)
if (start < 0 || end < 0) { console.log('anchor missing'); process.exit(1) }
const endIdx = end + endMark.length

const block = [
"  const isErp = !!currentTpl.erp",
"  const province = $('#province')",
"  const phoneEl = $('#phone')",
"  const siteEl = $('#site')",
"  const phone = phoneEl.value.trim()",
"  const site = siteEl.value.trim()",
"",
"  if (isErp) {",
"    if (!province.value.trim()) {",
"      province.classList.add('invalid')",
"      province.focus()",
"      throw new Error('省区不能为空')",
"    }",
"    province.classList.remove('invalid')",
"    if (currentTpl.needPhone && !phone) {",
"      phoneEl.classList.add('invalid')",
"      phoneEl.focus()",
"      throw new Error(currentTpl.name + ' 需要填客户电话')",
"    }",
"    if (phone && !/^\\d{6,15}$/.test(phone)) {",
"      phoneEl.classList.add('invalid')",
"      phoneEl.focus()",
"      throw new Error('客户电话只填数字')",
"    }",
"    phoneEl.classList.remove('invalid')",
"  } else {",
"    if (!site) {",
"      siteEl.classList.add('invalid')",
"      siteEl.focus()",
"      throw new Error('非 ERP 任务请填网点 / 位置')",
"    }",
"    siteEl.classList.remove('invalid')",
"  }",
].join('\n')

s = s.slice(0, start) + block + s.slice(endIdx)
fs.writeFileSync('public/index.html', s, 'utf8')
console.log('validation replaced')
