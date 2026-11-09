import fs from 'node:fs'
let s = fs.readFileSync('public/index.html','utf8')

// buildMessage：按模板决定校验与字段
const oldValidate = `  const note = noteEl.value.trim()
  if (!note) throw new Error('还没写工单说明')
  const province = $('#province')
  if (!province.value.trim()) {
    province.classList.add('invalid')
    province.focus()
    throw new Error('省区不能为空')
  }
  province.classList.remove('invalid')

  const phoneEl = $('#phone')
  const phone = phoneEl.value.trim()
  if (currentTpl.needPhone && !phone) {
    phoneEl.classList.add('invalid')
    phoneEl.focus()
    throw new Error(\`\${currentTpl.name} 需要填客户电话\`)
  }
  if (phone && !/^\\d{6,15}$/.test(phone)) {
    phoneEl.classList.add('invalid')
    phoneEl.focus()
    throw new Error('客户电话只填数字')
  }
  phoneEl.classList.remove('invalid')`

const newValidate = `  const note = noteEl.value.trim()
  if (!note) throw new Error('还没写工单说明')

  const isErp = !!currentTpl.erp
  const province = $('#province')
  const phoneEl = $('#phone')
  const siteEl = $('#site')
  const phone = phoneEl.value.trim()
  const site = siteEl.value.trim()

  if (isErp) {
    if (!province.value.trim()) {
      province.classList.add('invalid')
      province.focus()
      throw new Error('省区不能为空')
    }
    province.classList.remove('invalid')
    if (currentTpl.needPhone && !phone) {
      phoneEl.classList.add('invalid')
      phoneEl.focus()
      throw new Error(currentTpl.name + ' 需要填客户电话')
    }
    if (phone && !/^\\d{6,15}$/.test(phone)) {
      phoneEl.classList.add('invalid')
      phoneEl.focus()
      throw new Error('客户电话只填数字')
    }
    phoneEl.classList.remove('invalid')
  } else {
    if (!site) {
      siteEl.classList.add('invalid')
      siteEl.focus()
      throw new Error('非 ERP 任务请填网点 / 位置')
    }
    siteEl.classList.remove('invalid')
  }`

if (!s.includes(oldValidate)) { console.log('validate anchor missing'); process.exit(1) }
s = s.replace(oldValidate, newValidate)

// meta 组装
const oldMeta = "    const meta = [\n      `省区：${$('#province').value.trim()}`,\n      `片区：${$('#district').value.trim() || '(空)'}`,\n      `客户名：${$('#customer').value.trim() || '(空)'}`,\n      `标题客户名：${customerName()}`,\n      `实施人：${$('#owner').value.trim() || '四川省区黄俊浍'}`,\n      `客户电话：${phone || '(空)'}`,\n      `网点/位置：${$('#site').value.trim() || '(空)'}`,\n    ].join('\\n')"

const newMeta = "    const owner = $('#owner').value.trim() || '四川省区黄俊浍'\n" +
"    const meta = isErp\n" +
"      ? [\n" +
"          `省区：${$('#province').value.trim()}`,\n" +
"          `片区：${$('#district').value.trim() || '(空)'}`,\n" +
"          `客户名：${$('#customer').value.trim() || '(空)'}`,\n" +
"          `标题客户名：${customerName()}`,\n" +
"          `实施人：${owner}`,\n" +
"          `客户电话：${phone}`,\n" +
"          `网点/位置：${site || '(空)'}`,\n" +
"        ].join('\\n')\n" +
"      : [`实施人：${owner}`, `网点/位置：${site}`].join('\\n')"

if (!s.includes(oldMeta)) { console.log('meta anchor missing'); process.exit(1) }
s = s.replace(oldMeta, newMeta)

fs.writeFileSync('public/index.html', s, 'utf8')
console.log('buildMessage patched')
