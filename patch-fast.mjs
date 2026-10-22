import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')

// 1) 引入 preflight 并在连接前自检
s = s.replace(
`import { connect, close, exportState, BASE } from './lib/browser.mjs'
import fs from 'node:fs'`,
`import { connect, close, exportState, BASE } from './lib/browser.mjs'
import { preflight, checkLogin } from './lib/preflight.mjs'
import fs from 'node:fs'`)

s = s.replace(
`const ctx = await connect()`,
`// 开跑前自检：CDP 挂了自动重启整栈，登录失效直接提示
await preflight()
const loginOk = await checkLogin()
if (loginOk === false) {
  console.log('[x] 登录态失效，请先跑 node login.mjs')
  process.exit(1)
}

const ctx = await connect()`)

// 2) 字段名校验（兼容旧写法 user）
s = s.replace(
`const orders = JSON.parse(fs.readFileSync(file, 'utf8'))`,
`const orders = JSON.parse(fs.readFileSync(file, 'utf8'))

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
    console.log(\`[warn] 第 \${i + 1} 单缺字段: \${miss.join(', ')} | \${o.subject || '(无标题)'}\`)
    bad++
  }
}
if (bad) console.log(\`[warn] 共 \${bad} 单字段不全，继续跑但可能保存失败\`)`)

// 3) 去掉标签后的固定 2.2s 等待，改由校验补填兜底
s = s.replace(
`  // 换标签会触发工单信息区重建，等它稳定再填后面的字段
  if (okTag) await page.waitForTimeout(2200)`,
`  // 换标签可能触发工单信息区重建；不硬等，后面有校验补填
  if (okTag) await page.waitForTimeout(500)`)

// 4) 用户搜索改轮询
s = s.replace(
`  await inp.fill(String(value))
  await page.waitForTimeout(2600)
  const has = await page.evaluate(() =>
    [...document.querySelectorAll('li.com-realtime-async-request-li')].some((e) => e.offsetParent !== null)
  )
  if (!has) return false
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1400)`,
`  await inp.fill(String(value))
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
  }`)

fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('patched')
