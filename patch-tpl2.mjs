import fs from 'node:fs'
let s = fs.readFileSync('public/index.html','utf8')

// 模板增加 erp 标记
s = s.replace(
"  { id: 'erp-system', name: 'ERP 系统模式', count: 27, needPhone: true, ic: '系',",
"  { id: 'erp-system', name: 'ERP 系统模式', count: 27, needPhone: true, erp: true, ic: '系',")
s = s.replace(
"  { id: 'erp-platform', name: 'ERP 平台模式', count: 8, needPhone: true, ic: '平',",
"  { id: 'erp-platform', name: 'ERP 平台模式', count: 8, needPhone: true, erp: true, ic: '平',")
s = s.replace(
"  { id: 'erp-offline', name: 'ERP 线下打单', count: 10, needPhone: true, ic: '线',",
"  { id: 'erp-offline', name: 'ERP 线下打单', count: 10, needPhone: true, erp: true, ic: '线',")

// 切换模板时折叠/展开
const oldPick = `function pickTemplate(id) {
  currentTpl = TEMPLATES.find((t) => t.id === id) || null
  renderTemplates()
  if (!currentTpl) return
  tplHint.textContent = currentTpl.hint
  tplHint.classList.add('show')
  $('#phoneReq').style.display = currentTpl.needPhone ? 'inline' : 'none'
  noteEl.placeholder = currentTpl.example
  if (currentTpl.needPhone) $('#phone').focus()
}`
const newPick = `function pickTemplate(id) {
  currentTpl = TEMPLATES.find((t) => t.id === id) || null
  renderTemplates()
  if (!currentTpl) return
  tplHint.textContent = currentTpl.hint
  tplHint.classList.add('show')
  noteEl.placeholder = currentTpl.example

  const isErp = !!currentTpl.erp
  // 非 ERP 任务把 ERP 专用字段整块收起来，只留「实施人 + 网点/位置」
  document.querySelectorAll('.erp-only').forEach((el) => el.classList.toggle('hide', !isErp))
  $('#phoneReq').style.display = currentTpl.needPhone ? 'inline' : 'none'
  $('#siteReq').style.display = isErp ? 'none' : 'inline'

  if (currentTpl.needPhone) $('#phone').focus()
  else $('#site').focus()
}`
if (!s.includes(oldPick)) { console.log('pickTemplate anchor missing'); process.exit(1) }
s = s.replace(oldPick, newPick)

fs.writeFileSync('public/index.html', s, 'utf8')
console.log('template logic patched')
