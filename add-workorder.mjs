// 工单录入助手
//   node add-workorder.mjs orders.json
//
// 浏览器：连接常驻 Chrome。脚本退出后窗口仍在桌面上，不会被关掉。
// 提交：只填表，绝不点「保存工单」。
import { connect, close, exportState, BASE, workPage } from './lib/browser.mjs'
import fs from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('用法: node add-workorder.mjs orders.json')
  process.exit(1)
}
const orders = JSON.parse(fs.readFileSync(file, 'utf8'))

// 表单区 .label-wrapper 下标
const W = { system: 6, tag: 7, category: 8, sysType: 9, channel: 10, duration: 11, user: 12 }

const OPTION_SEL = 'li.com-items-list-li'
const TREE_LI = 'li.com-tree-flat-li'
const USER_OPT_SEL = 'li.com-realtime-async-request-li'

const ctx = await connect()

/** 复用同一个工位标签页（没有才新建），不刷屏开新标签 */
let page = await workPage(ctx)
await page.bringToFront()

/** 清空表单，避免草稿回填污染 */
async function resetForm() {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,.com-button-layout')].find(
      (x) => (x.innerText || '').trim() === '重置'
    )
    b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  await page.waitForTimeout(1500)
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape')
    await page.mouse.click(700, 940)
    await page.waitForTimeout(300)
  }
}

/** 读取某个字段当前显示值（用 wrapper 文本，input.value 不可靠） */
const fieldText = (idx) =>
  page.evaluate(
    (i) => (document.querySelectorAll('.label-wrapper')[i]?.innerText || '').replace(/\s+/g, ' ').trim(),
    idx
  )

const closePopovers = async () => {
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Escape')
    await page.mouse.click(700, 940)
    await page.waitForTimeout(400)
  }
}

/** 用坐标点击打开字段，绕开 locator 的可操作性等待（面板遮挡时会卡 45s） */
async function openField(idx) {
  const el = page.locator('.label-wrapper').nth(idx).locator('input.com-input-element').first()
  await el.waitFor({ state: 'visible', timeout: 25000 })
  const box = await el.boundingBox()
  if (!box) throw new Error(`字段 ${idx} 不可见`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** 普通下拉：精确匹配文本 */
async function pick(idx, text) {
  await openField(idx)
  await page.waitForTimeout(1500)

  const opts = await page.evaluate((sel) =>
    [...document.querySelectorAll(sel)]
      .filter((e) => e.offsetParent !== null)
      .map((e) => (e.textContent || '').trim())
      .filter(Boolean),
    OPTION_SEL
  )

  const hit = opts.find((o) => o === text)
  if (!hit) {
    console.log(`   [warn] 找不到选项 "${text}"，本级可选: ${opts.join(' / ')}`)
    await closePopovers()
    return false
  }

  const box = await page.evaluate(
    ({ sel, txt }) => {
      const el = [...document.querySelectorAll(sel)].find(
        (e) => e.offsetParent !== null && (e.textContent || '').trim() === txt
      )
      if (!el) return null
      el.scrollIntoView({ block: 'center' })
      const b = el.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    },
    { sel: OPTION_SEL, txt: hit }
  )
  if (!box || box.w === 0) {
    await closePopovers()
    return false
  }
  await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2)
  await page.waitForTimeout(1400)

  const val = await fieldText(idx)
  const ok = val.includes(text)
  if (!ok) console.log(`   [warn] "${text}" 点选后未回填，当前: ${val}`)
  return ok
}

/** 标签：多列树形级联，逐级点选 */
async function pickTag(chain) {
  await openField(W.tag)
  await page.waitForTimeout(2000)

  for (const [i, want] of chain.entries()) {
    const r = await page.evaluate(
      ({ sel, t }) => {
        const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
        const col = cols[cols.length - 1]
        if (!col) return { ok: false, why: '无可见列' }
        const items = [...col.querySelectorAll(sel)]
        const texts = items.map((x) => (x.textContent || '').trim())
        const idx = texts.findIndex((x) => x === t)
        if (idx < 0) return { ok: false, why: '本级无此选项', total: texts.length, sample: texts.slice(0, 30) }
        const el = items[idx]
        el.scrollIntoView({ block: 'center' })
        const b = el.getBoundingClientRect()
        return { ok: true, idx, total: texts.length, cols: cols.length, x: b.x, y: b.y, w: b.width, h: b.height }
      },
      { sel: TREE_LI, t: want }
    )
    if (!r.ok) {
      console.log(`   [warn] 标签第${i + 1}级 "${want}" 失败: ${r.why}，本级共${r.total}项`)
      console.log(`      可见: ${(r.sample || []).join(' / ')}`)
      await closePopovers()
      return false
    }
    await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2)
    await page.waitForTimeout(1600)
    console.log(`   标签 L${i + 1} "${want}" ok (第${r.idx + 1}/${r.total}, 已展开${r.cols}列)`)
  }

  await closePopovers()
  const back = await page.evaluate(
    (i) => ([...document.querySelectorAll('.label-wrapper')][i]?.innerText || '').replace(/\s+/g, ' '),
    W.tag
  )
  const ok = chain.every((p) => back.includes(p))
  console.log(`   标签回填: ${ok ? 'ok' : '不完整'} -> ${back.trim().slice(0, 140)}`)
  return ok
}

/** ERP 单的联系方式：选完所属系统/标签后会替代「用户」栏，位置仍是 12 */
async function fillContact(phone) {
  const wrap = page.locator('.label-wrapper').nth(W.user)
  const name = await wrap.locator('.label-name').innerText().catch(() => '')
  if (!/联系方式/.test(name)) {
    console.log(`   [warn] 第12栏不是联系方式，而是 "${name.trim()}"`)
  }
  const inp = wrap.locator('input.com-input-element').first()
  await inp.waitFor({ state: 'visible', timeout: 20000 })
  await inp.fill(String(phone))
  await page.waitForTimeout(600)
  const got = await inp.inputValue().catch(() => '')
  const ok = got.replace(/\s/g, '') === String(phone)
  if (!ok) console.log(`   [warn] 联系方式回读 "${got}"`)
  return ok
}

/** 用户：异步搜索后键盘选中（鼠标点击在该组件上不可靠） */
async function pickUser(kw) {
  const inp = page.locator('.label-wrapper').nth(W.user).locator('input.com-input-element').first()
  await inp.waitFor({ state: 'visible', timeout: 25000 })
  await openField(W.user)
  await inp.fill(kw) // fill 会触发 input 事件，type 有时不触发异步搜索
  await page.waitForTimeout(3000)

  const hit = await page.evaluate(
    ({ sel, k }) => {
      const el = [...document.querySelectorAll(sel)].find(
        (e) => e.offsetParent !== null && (e.textContent || '').includes(k)
      )
      return el ? (el.textContent || '').trim() : null
    },
    { sel: USER_OPT_SEL, k: kw }
  )
  if (!hit) {
    const list = await page.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)]
          .filter((e) => e.offsetParent !== null)
          .map((e) => (e.textContent || '').trim()),
      USER_OPT_SEL
    )
    console.log(`   [warn] 用户 "${kw}" 无结果，候选: ${list.join(' / ') || '(空)'}`)
    return false
  }

  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1600)

  await closePopovers()
  const back = await fieldText(W.user)
  const ok = /[一-龥]/.test(back) && !back.includes('请选择')
  console.log(`   用户: "${back.slice(0, 60)}" => ${ok ? 'ok' : '未回填'}`)
  return ok
}

// --tabs：每单一个标签页，填完保留，供人工逐单核对后保存
const useTabs = process.argv.includes('--tabs')
const startAt = Number((process.argv.find((a) => a.startsWith('--start=')) || '--start=1').split('=')[1]) - 1
const progressFile = 'progress.json'
const done = new Set()
if (fs.existsSync(progressFile)) {
  try {
    JSON.parse(fs.readFileSync(progressFile, 'utf8')).done?.forEach((i) => done.add(i))
  } catch {}
}
if (done.size) console.log(`[*] 断点续填：已完成 ${done.size} 单，跳过`)

page.setDefaultTimeout(15000)

for (const [n, o] of orders.entries()) {
  if (n < startAt || done.has(n)) continue
  console.log(`\n=== 工单 ${n + 1}/${orders.length} ===`)
  try {
  if (useTabs) page = await ctx.newPage()
  await page.goto(`${BASE}/workOrder/add`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)

  if (!page.url().startsWith(BASE)) {
    console.log('[x] 登录态失效，请先跑 node login.mjs 完成扫码')
    break
  }

  // 关键：清空草稿，否则上一单的值会被自动回填
  await resetForm()

  const ta = page.locator('.com-textarea-element')
  if (o.subject) {
    await ta.nth(0).fill(o.subject)
    console.log(`  主题: ${o.subject}`)
  }
  if (o.description) {
    await ta.nth(1).fill(o.description)
    console.log(`  描述: ${o.description.slice(0, 50)}...`)
  }
  if (o.image) {
    const files = Array.isArray(o.image) ? o.image : [o.image]
    await page.locator('input[type=file]').first().setInputFiles(files)
    console.log(`  图片: ${files.join(', ')}`)
    await page.waitForTimeout(3500)
  }
  if (o.solution) {
    await ta.nth(2).fill(o.solution)
    console.log(`  办法: ${o.solution.slice(0, 50)}...`)
  }

  const tryPick = async (idx, text, label) => {
    for (let t = 0; t < 2; t++) {
      await closePopovers()
      if (await pick(idx, text)) return true
      console.log(`   [retry] ${label} 第 ${t + 2} 次`)
      await page.waitForTimeout(800)
    }
    return false
  }

  if (o.system) console.log(`  所属系统:`, (await tryPick(W.system, o.system, '所属系统')) ? 'ok' : 'FAIL')
  if (o.tagPath?.length) {
    let ok = false
    for (let t = 0; t < 2 && !ok; t++) {
      await closePopovers()
      ok = await pickTag(o.tagPath)
    }
    console.log(`  标签:`, ok ? 'ok' : 'FAIL')
  }
  if (o.category) console.log(`  问题分类:`, (await tryPick(W.category, o.category, '问题分类')) ? 'ok' : 'FAIL')
  if (o.systemType) console.log(`  系统类型:`, (await tryPick(W.sysType, o.systemType, '系统类型')) ? 'ok' : 'FAIL')
  if (o.channel) console.log(`  反馈渠道:`, (await tryPick(W.channel, o.channel, '反馈渠道')) ? 'ok' : 'FAIL')
  if (o.duration != null) {
    await page.locator('.label-wrapper').nth(W.duration).locator('input.com-input-element').first().fill(String(o.duration))
    console.log(`  处理时长: ${o.duration} 分钟`)
  }

  // 联系方式必须最后填：选完所属系统/标签后「用户」栏会被重建为「联系方式」
  if (o.contact) {
    const ok = await fillContact(o.contact)
    console.log(`  联系方式:`, ok ? 'ok' : 'FAIL')
  }

  await closePopovers()
  done.add(n)
  fs.writeFileSync(progressFile, JSON.stringify({ done: [...done].sort((a, b) => a - b) }), 'utf8')

  // 只给第一单和最后一单留截图，避免刷出几十张图
  if (n === 0 || n === orders.length - 1) {
    await page.bringToFront()
    const shot = `filled-${n + 1}.png`
    await page.screenshot({ path: shot, fullPage: true })
    console.log(`  截图 -> ${shot}`)
  }
  } catch (e) {
    console.log(`   [x] 本单出错，跳过: ${String(e.message).slice(0, 120)}`)
    await closePopovers().catch(() => {})
  }
}

await exportState(ctx).catch(() => {})
console.log('\n[*] 已填完，未提交。请在 Chrome 窗口里核对后手动点「保存工单」。')
console.log('[*] 本脚本已退出，Chrome 窗口会继续留在桌面上。')
await close(ctx)
process.exit(0)