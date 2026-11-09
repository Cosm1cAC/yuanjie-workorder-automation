import fs from 'node:fs'
let s = fs.readFileSync('public/index.html','utf8')

const block = `
// ---------- 工单模板 ----------
const TEMPLATES = [
  { id: 'erp-system', name: 'ERP 系统模式', count: 27, needPhone: true, ic: '系',
    hint: '按功能点拆 27 单：订单审核/手工单/打印记录/各类策略/商品/基础管理/辅助功能/实施调研',
    example: '按系统模式拆单' },
  { id: 'erp-platform', name: 'ERP 平台模式', count: 8, needPhone: true, ic: '平',
    hint: '固定 8 单：店铺授权/打印模版/打单设置/平台商品整理/订单打单筛选/快递匹配策略/订单补打/审单策略',
    example: '按平台模式拆单' },
  { id: 'erp-offline', name: 'ERP 线下打单', count: 10, needPhone: true, ic: '线',
    hint: '固定 10 单：登录/绑定K码/面单余额/快递单模板/设置地址/添加店铺/打印助手/打单设置/打印快递单/充值转移',
    example: '按线下打单模式拆单' },
  { id: 'printer', name: '打印机 / 办公设备', count: 0, needPhone: false, ic: '打',
    hint: '按「一台设备 / 一个动作」拆。说明是装驱动、打不出来、卡纸，还是硬件报修',
    example: '打印机卡纸，现场检查是内部故障，已联系售后报修' },
  { id: 'network', name: '网络故障', count: 0, needPhone: false, ic: '网',
    hint: '说明现象（掉线/连不上/慢）、影响范围（整层/单台）、已做的处理',
    example: '办公室无线网连不上，已把 DHCP 改为固定 IP，观察中' },
  { id: 'security', name: '安防平台接入', count: 1, needPhone: false, ic: '安',
    hint: '链路：安防平台/网点监控/网点监控配置/OSD需接入安防平台/监控接入安防平台（末两级同名，要点到第6列）',
    example: '某某网点监控接入安防平台，16 个监控点全部在线' },
  { id: 'custom', name: '其他 / 自定义', count: 0, needPhone: false, ic: '他',
    hint: '不套模板，按说明处理',
    example: '说明要录什么，我会先查同类工单再填' },
]
let currentTpl = null

const tplGrid = $('#tplGrid')
const tplHint = $('#tplHint')

function renderTemplates() {
  tplGrid.innerHTML = TEMPLATES.map((t) =>
    \`<div class="tpl\${currentTpl && currentTpl.id === t.id ? ' active' : ''}" data-tpl="\${t.id}">
       <div class="ic">\${t.ic}</div>
       <div>
         <div class="nm">\${t.name}</div>
         <div class="ct">\${t.count ? t.count + ' 单' : '按需拆'}</div>
       </div>
     </div>\`
  ).join('')
}

function pickTemplate(id) {
  currentTpl = TEMPLATES.find((t) => t.id === id) || null
  renderTemplates()
  if (!currentTpl) return
  tplHint.textContent = currentTpl.hint
  tplHint.classList.add('show')
  $('#phoneReq').style.display = currentTpl.needPhone ? 'inline' : 'none'
  noteEl.placeholder = currentTpl.example
  if (currentTpl.needPhone) $('#phone').focus()
}

tplGrid.addEventListener('click', (e) => {
  const el = e.target.closest('[data-tpl]')
  if (el) pickTemplate(el.dataset.tpl)
})

$('#phone').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, '')
  e.target.classList.remove('invalid')
})
$('#site').addEventListener('input', () => {})

renderTemplates()
`
const anchor = '// 会话检测 + 切换'
if (!s.includes(anchor)) { console.log('anchor missing'); process.exit(1) }
s = s.replace(anchor, block + '\n' + anchor)
fs.writeFileSync('public/index.html', s, 'utf8')
console.log('templates block inserted')
