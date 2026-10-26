// ERP 批量录单（快速版）
//
// 特点：
//   - 全程只用一个标签页，填完即保存，不留一堆旧标签
//   - 窗口自动最小化，不抢焦点（不是无头模式）
//   - 用显式等待代替固定 sleep，速度比旧脚本快 3~5 倍
//
// 用法：
//   node erp-batch.mjs orders.json
//   node erp-batch.mjs orders.json --dry       只填不保存（测速）
//   node erp-batch.mjs orders.json --limit=2   只跑前 2 单
import { connect, close, exportState, BASE } from './lib/browser.mjs'
import { preflight, checkLogin } from './lib/preflight.mjs'
import fs from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('用法: node erp-batch.mjs orders.json [--dry] [--limit=N]')
  process.exit(1)
}
const orders = JSON.parse(fs.readFileSync(file, 'utf8'))

let bad = 0
for (const [i, o] of orders.entries()) {
  if (!o.contact && o.user) o.contact = o.user // 兼容旧写法
  const miss = []
  if (!o.subject) miss.push('subject')
  if (!o.contact) miss.push('contact')
  if (!o.system) miss.push('system')
  if (!o.category) miss.push('category')
  if (!o.systemType) miss.push('systemType')
  if (!o.channel) miss.push('channel')
  if (!Array.isArray(o.tagPath) || o.tagPath.length !== 6) miss.push('tagPath(必须6级)')
  if (!o.image) miss.push('image')
  if (miss.length) {
    console.log(`[warn] 第 ${i + 1} 单缺字段: ${miss.join(', ')} | ${o.subject || '(无标题)'}`)
    bad++
  }
}
if (bad) console.log(`[warn] 共 ${bad} 单字段不全，继续跑但可能保存失败`)
const DRY = process.argv.includes('--dry')
// --show：不把窗口挪走，你可以全程盯着看
const SHOW = process.argv.includes('--show')
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) || '--limit=0').split('=')[1]) || orders.length

const W = { system: 6, tag: 7, category: 8, sysType: 9, channel: 10, duration: 11, contact: 12 }
const OPT = 'li.com-items-list-li'
const TREE = 'li.com-tree-flat-li'

// 开跑前自检：CDP 挂了自动重启整栈，登录失效直接提示
await preflight()
const loginOk = await checkLogin()
if (loginOk === false) {
  // cookie 快照可能过期，但浏览器里还登着；先继续，真失效会在打开表单时被发现
  console.log('[warn] cookie 登录检查失败（可能是快照过期），先继续，必要时会提示扫码')
}

const ctx = await connect()

/** 只保留一个工作标签页：优先复用已有的 add/list 页 */
async function pickTab() {
  const pages = ctx.pages()
  const add = pages.find((p) => p.url().includes('/workOrder/add'))
  if (add) return add
  const list = pages.find((p) => p.url().includes('/workOrder/list'))
  if (list) return list
  return await ctx.newPage()
}

let page = await pickTab()

// 表单有未保存内容时，导航会弹 beforeunload 确认框，必须自动点掉
page.on('dialog', (d) => d.accept().catch(() => {}))

// 只留一个标签页，其余全关掉（这些标签都是脚本自己开的）
for (const p of ctx.pages()) {
  if (p !== page) await p.close().catch(() => {})
}
console.log('[*] 已清理多余标签，当前只留 1 个')

/**
 * 把窗口挪到屏幕外：不抢焦点，但保持正常渲染。
 * 不用最小化——最小化后 Chrome 会节流渲染，下拉面板的坐标会算错。
 */
let PARKED_WINDOW = null

async function parkWindow() {
  try {
    const s = await ctx.newCDPSession(page)
    const { windowId } = await s.send('Browser.getWindowForTarget')
    PARKED_WINDOW = windowId
    await s.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'normal', left: -2400, top: 0, width: 1400, height: 950 },
    })
    console.log('[*] 窗口临时移到屏幕外（跑完自动归位）')
  } catch (e) {
    console.log('[*] 移窗失败（不影响运行）:', e.message.slice(0, 60))
  }
}

/** 跑完/出错/中断时把窗口挪回可见位置，否则用户找不到它 */
async function restoreWindow() {
  if (!PARKED_WINDOW) return
  try {
    const s = await ctx.newCDPSession(page)
    await s.send('Browser.setWindowBounds', {
      windowId: PARKED_WINDOW,
      bounds: { windowState: 'normal', left: 120, top: 60, width: 1600, height: 960 },
    })
    console.log('[*] 窗口已归位')
  } catch {}
  PARKED_WINDOW = null
}

const fieldText = (i) =>
  page.evaluate(
    (idx) => (document.querySelectorAll('.label-wrapper')[idx]?.innerText || '').replace(/\s+/g, ' ').trim(),
    i
  )

/** 关掉仍然展开的浮层，避免它盖住下一个要点的字段 */
async function closePanels() {
  for (let i = 0; i < 4; i++) {
    const open = await page.evaluate(() =>
      [...document.querySelectorAll('.com-popover-content, .com-realtime-async-request-container')].some(
        (e) => e.offsetParent !== null
      )
    )
    if (!open) return
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(100)
  }
}

/** 用坐标点开字段，避免 locator 动作性等待 */
async function openField(idx) {
  await closePanels()
  const el = page.locator('.label-wrapper').nth(idx).locator('input.com-input-element').first()
  // 字段可能在视口外，先滚进来再量坐标，否则点击落空
  await el.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(80)
  const box = await el.boundingBox()
  if (!box) throw new Error(`字段 ${idx} 不可见`)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

async function waitOptions(timeout = 2500) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    const list = await page.evaluate((sel) =>
      [...document.querySelectorAll(sel)]
        .filter((e) => e.offsetParent !== null)
        .map((e) => (e.textContent || '').trim())
        .filter(Boolean)
    , OPT)
    if (list.length) return list
    await page.waitForTimeout(120)
  }
  return []
}

async function pick(idx, text, label) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.keyboard.press('Escape').catch(() => {})
    await openField(idx)
    await page.waitForTimeout(150)

    // 找到目标项，滚到中间，等滚动稳定后再重新量坐标
    const found = await page.evaluate(
      ({ sel, txt }) => {
        const el = [...document.querySelectorAll(sel)].find(
          (e) => e.offsetParent !== null && (e.textContent || '').trim() === txt
        )
        if (!el) return false
        el.scrollIntoView({ block: 'center' })
        return true
      },
      { sel: OPT, txt: text }
    )
    if (!found) {
      await page.waitForTimeout(250)
      continue
    }
    await page.waitForTimeout(220)

    const box = await page.evaluate(
      ({ sel, txt }) => {
        const el = [...document.querySelectorAll(sel)].find(
          (e) => e.offsetParent !== null && (e.textContent || '').trim() === txt
        )
        if (!el) return null
        const b = el.getBoundingClientRect()
        return { x: b.x, y: b.y, w: b.width, h: b.height }
      },
      { sel: OPT, txt: text }
    )
    if (!box || !box.w) continue

    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2)
    await page.waitForTimeout(260)
    if ((await fieldText(idx)).includes(text)) return true
    await page.waitForTimeout(200)
  }
  console.log(`   [warn] ${label} 未能选中 "${text}"，当前: ${await fieldText(idx)}`)
  return false
}

async function pickTag(chain) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.keyboard.press('Escape').catch(() => {})
    // 可能被上一个下拉的浮层挡住，点不开就重试
    let opened = false
    for (let k = 0; k < 3 && !opened; k++) {
      await openField(W.tag)
      const t0 = Date.now()
      while (Date.now() - t0 < 3500) {
        const n = await page.evaluate(
          () => [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null).length
        )
        if (n > 0) { opened = true; break }
        await page.waitForTimeout(120)
      }
      if (!opened) await page.waitForTimeout(200)
    }
    if (!opened) return false

    let ok = true
    for (const [i, want] of chain.entries()) {
      let done = false
      for (let t = 0; t < 20 && !done; t++) {
        const r = await page.evaluate(
          ({ sel, txt, level }) => {
            const cols = [...document.querySelectorAll('.com-tree-flat-ul')].filter((c) => c.offsetParent !== null)
            const col = cols[level] || cols[cols.length - 1]
            if (!col) return { ok: false, why: '无列' }
            const items = [...col.querySelectorAll(sel)]
            const texts = items.map((x) => (x.textContent || '').trim())
            const idx = texts.findIndex((x) => x === txt)
            if (idx < 0) return { ok: false, why: '本级无此项', n: texts.length, sample: texts.slice(0, 15) }
            const el = items[idx]
            el.scrollIntoView({ block: 'center' })
            const b = el.getBoundingClientRect()
            return { ok: true, cols: cols.length, x: b.x, y: b.y, w: b.width, h: b.height }
          },
          { sel: TREE, txt: want, level: i }
        )
        if (!r.ok) {
          await page.waitForTimeout(200)
          continue
        }
        await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2)
        await page.waitForTimeout(260)
        done = true
      }
      if (!done) {
        console.log(`   [warn] 标签第${i + 1}级 "${want}" 失败`)
        ok = false
        break
      }
    }
    if (ok) {
      await page.keyboard.press('Escape').catch(() => {})
      const back = await fieldText(W.tag)
      if (chain.every((p) => back.includes(p))) return true
    }
  }
  return false
}

async function fillContact(value) {
  const wrap = page.locator('.label-wrapper').nth(W.contact)
  const labelName = await wrap.locator('.label-name').innerText().catch(() => '')
  const inp = wrap.locator('input.com-input-element').first()
  if (!(await inp.count())) return false

  // ERP 单是「联系方式」：直接填手机号
  if (/联系方式/.test(labelName)) {
    await inp.fill(String(value))
    await page.waitForTimeout(150)
    return (await inp.inputValue()).replace(/\s/g, '') === String(value)
  }

  // 普通单是「用户」：异步搜索，键盘选中
  await openField(W.contact)
  await inp.fill(String(value))
  // 轮询候选，通常 600ms 内就出来，比死等 2.6s 快
  let has = false
  const t0 = Date.now()
  while (Date.now() - t0 < 3500) {
    has = await page.evaluate(() =>
      [...document.querySelectorAll('li.com-realtime-async-request-li')].some((e) => e.offsetParent !== null)
    )
    if (has) break
    await page.waitForTimeout(120)
  }
  if (!has) return false
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(150)
  await page.keyboard.press('Enter')
  // 等回填
  const t1 = Date.now()
  while (Date.now() - t1 < 2000) {
    const v = await page.evaluate(
      (i) => (document.querySelectorAll('.label-wrapper')[i]?.innerText || '').trim(),
      W.contact
    )
    if (/[一-龥]/.test(v)) break
    await page.waitForTimeout(120)
  }
  const back = await page.evaluate(
    (i) => (document.querySelectorAll('.label-wrapper')[i]?.innerText || '').replace(/\s+/g, ' ').trim(),
    W.contact
  )
  return /[一-龥]/.test(back) && !back.includes('请选择')
}

/** 打开新增页，失败自动重试（未保存提示/导航被打断都会导致 ERR_ABORTED） */
async function gotoAdd() {
  let last
  for (let i = 0; i < 4; i++) {
    try {
      await page.goto(`${BASE}/workOrder/add`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      return true
    } catch (e) {
      last = e
      await page.waitForTimeout(900)
    }
  }
  throw last
}

/** 从列表页直接进新增页（SPA 跳转，比整页 reload 快 2 秒多） */
async function openAdd() {
  if (page.url().includes('/workOrder/list')) {
    const clicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button,.com-button-layout')].find(
        (x) => (x.innerText || '').trim() === '新建工单'
      )
      if (!b) return false
      b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      return true
    })
    if (clicked) {
      try {
        await page.waitForSelector('.label-wrapper', { timeout: 12000 })
        return true
      } catch {}
    }
  }
  await gotoAdd()
  return true
}

async function resetForm() {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '重置')
    b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  await page.waitForTimeout(250)
  await page.keyboard.press('Escape').catch(() => {})
}

async function fillOrder(o) {
  const ta = page.locator('.com-textarea-element')
  let _t = Date.now()
  await ta.nth(0).fill(o.subject)
  await ta.nth(1).fill(o.description || o.subject)
  console.log(`      · 文本 ${((Date.now()-_t)/1000).toFixed(1)}s`)
  if (o.image) {
    _t = Date.now()
    await page.locator('input[type=file]').first().setInputFiles(o.image)
    await page.waitForTimeout(500)
    console.log(`      · 图片 ${((Date.now()-_t)/1000).toFixed(1)}s`)
  }
  if (o.solutionImage) {
    await page.locator('input[type=file]').nth(1).setInputFiles(o.solutionImage)
    await page.waitForTimeout(400)
  }
  if (o.solution) await ta.nth(2).fill(o.solution)

  const T = async (label, fn) => { const t=Date.now(); const r=await fn(); console.log(`      · ${label} ${((Date.now()-t)/1000).toFixed(1)}s`); return r }
  const okSystem = await T('所属系统', () => pick(W.system, o.system, '所属系统'))
  const okTag = o.tagPath?.length ? await T('标签', () => pickTag(o.tagPath)) : true
  const okCat = await T('问题分类', () => pick(W.category, o.category, '问题分类'))
  const okType = await T('系统类型', () => pick(W.sysType, o.systemType, '系统类型'))
  const okCh = await T('反馈渠道', () => pick(W.channel, o.channel, '反馈渠道'))

  if (o.duration != null) {
    await page.locator('.label-wrapper').nth(W.duration).locator('input.com-input-element').first().fill(String(o.duration))
  }
  // 校验补填：重建可能把前面的字段清掉
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
        console.log(`   [fix] ${label} 被清空，重填`)
        await pick(idx, val, label)
      }
    }
  }

  const okContact = o.contact ? await fillContact(o.contact) : true
  if (o.contact) console.log('  用户/联系方式:', okContact ? 'ok' : 'FAIL')

  return okSystem && okTag && okCat && okType && okCh && okContact
}

async function saveOrder() {
  await page.bringToFront().catch(() => {})
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,.com-button-layout')].find((x) => (x.innerText || '').trim() === '保存工单')
    b?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  const ok = await page
    .waitForFunction(() => !location.pathname.includes('/workOrder/add'), { timeout: 20000, polling: 400 })
    .then(() => true)
    .catch(() => false)
  return ok
}

/**
 * 打开一张干净的"新增工单"表单。
 *
 * 上一单保存失败时表单还是脏的，导航会弹 beforeunload 确认框，弹窗被接受后
 * 挂起的那次导航会把下一次 goto 打断（ERR_ABORTED / "interrupted by another
 * navigation"）—— 一次失败连累后面所有单。退到空白页把挂起导航清掉再重试。
 */
async function gotoAddForm() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(`${BASE}/workOrder/add`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('.label-wrapper', { timeout: 20000 })
      return true
    } catch (error) {
      await page.goto('about:blank', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(400)
      if (attempt === 2) throw error
    }
  }
  return false
}

await parkWindow()

/**
 * 预扫描系统里今天已存在的单（联系方式+标题）。
 * 保存失败重试时很容易造成重复单，先查一遍能直接跳过。
 */
async function scanExisting(titles) {
  const set = new Set()
  for (const title of titles) {
    const recs = await page.evaluate(async ({ base, t }) => {
      const r = await fetch(`${base}/customerService/workOrder/page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current: 1, size: 100, tab: '', code: '', title: t, systemName: '', labels: [], type: '',
          questionType: '', systemType: '', feedbackChannel: '', userNums: [], responsibleNums: [],
          groupIds: [], status: '', addRecord: '',
          lowerCreateTimeStamp: Date.now() - 7 * 24 * 3600 * 1000,
          upperCreateTimeStamp: Date.now() + 24 * 3600 * 1000,
        }),
      })
      const j = await r.json()
      return j?.data?.viewPage?.records || []
    }, { base: BASE, t: title })
    recs.forEach((r) => set.add(`${r.mobileNumber}|${r.title}`))
  }
  return set
}

const results = []
const tAll = Date.now()

// 先打开一次页面拿到同源上下文，再扫描已存在的单
await page.goto(`${BASE}/workOrder/list`, { waitUntil: 'domcontentloaded' }).catch(() => {})
const existing = await scanExisting([...new Set(orders.map((o) => o.subject.replace(/(ERP系统实施|erp对接-平台模式).*$/, '')))].slice(0, 10))
console.log(`[*] 系统中已存在 ${existing.size} 条同键记录，将跳过`)
await page.bringToFront().catch(() => {})

for (const [i, o] of orders.entries()) {
  if (i >= LIMIT) break
  const t0 = Date.now()
  console.log(`\n=== ${i + 1}/${Math.min(orders.length, LIMIT)} ${o.subject} ===`)
  try {
    if (existing && existing.has(`${o.contact}|${o.subject}`)) {
      console.log('   ↷ 已存在，跳过')
      results.push({ ok: true, skipped: true })
      continue
    }
    let _t = Date.now()
    // 清掉草稿缓存，否则上一次的标签会被回填
    if (page.url().startsWith(BASE)) {
      await page.evaluate(() => localStorage.removeItem('ADD_WORKORDER_KEY')).catch(() => {})
    }
    await gotoAddForm()
    await page.waitForTimeout(200)
    // 必须让这个标签页处于活动状态，否则后台标签页里保存不触发
    await page.bringToFront().catch(() => {})
    console.log(`      · 打开表单 ${((Date.now()-_t)/1000).toFixed(1)}s`)
    if (!page.url().startsWith(BASE)) throw new Error('登录失效')

    _t = Date.now(); await resetForm(); console.log(`      · 重置 ${((Date.now()-_t)/1000).toFixed(1)}s`)
    let filled = await fillOrder(o)
    // 字段没填成功就别存：存下去的是标签残缺的单，后面只能逐单返工。
    // 重开一张干净表单再试一次；还不行就跳过这单，交给核对环节补。
    if (!filled) {
      console.log('   [warn] 有字段未填成功，重开表单再试一次')
      await gotoAddForm()
      await page.bringToFront().catch(() => {})
      await resetForm()
      filled = await fillOrder(o)
    }
    if (!filled) {
      console.log('   ✗ 字段未填成功，本单不保存')
      results.push({ ok: false, error: '字段未填成功' })
      await page.goto('about:blank', { waitUntil: 'domcontentloaded' }).catch(() => {})
      continue
    }

    if (DRY) {
      console.log(`   [dry] 填写完成 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
      results.push({ ok: true, dry: true })
      continue
    }

    const saved = await saveOrder()
    const sec = ((Date.now() - t0) / 1000).toFixed(1)
    if (saved) {
      console.log(`   ✓ 已保存 ${sec}s`)
      results.push({ ok: true, sec })
    } else {
      console.log(`   ✗ 保存未跳转 ${sec}s`)
      results.push({ ok: false, sec })
      // 保存没跳转 → 表单还是脏的，先把页面清干净，别让下一单的 goto 被挂起导航打断
      await page.goto('about:blank', { waitUntil: 'domcontentloaded' }).catch(() => {})
    }
  } catch (e) {
    console.log(`   ✗ 出错: ${String(e.message).slice(0, 100)}`)
    results.push({ ok: false, error: e.message })
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' }).catch(() => {})
  }
}

const okN = results.filter((r) => r.ok).length
console.log(`\n完成 ${okN}/${results.length}，总耗时 ${((Date.now() - tAll) / 1000).toFixed(1)}s`)
if (!DRY) {
  const avg = results.filter((r) => r.sec).reduce((a, r) => a + Number(r.sec), 0) / (results.filter((r) => r.sec).length || 1)
  console.log(`平均 ${avg.toFixed(1)}s/单`)
}

await restoreWindow()
await exportState(ctx).catch(() => {})
await close(ctx)
process.exit(0)