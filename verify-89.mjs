import { connect, close, BASE } from './lib/browser.mjs'
import fs from 'node:fs'

const ctx = await connect()
const page = ctx.pages().find((p) => p.url().includes('/workOrder')) ?? ctx.pages()[0]
if (!page.url().includes('/workOrder/list')) await page.goto(`${BASE}/workOrder/list`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)

const sites = ['四川省成都市双流县航空港', '乐山市夹江县', '凉山会理县']
const all = []
for (const site of sites) {
  const j = await page.evaluate(
    async ({ base, title }) => {
      const r = await fetch(`${base}/customerService/workOrder/page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current: 1, size: 100, tab: '', code: '', title, systemName: '', labels: [], type: '',
          questionType: '', systemType: '', feedbackChannel: '', userNums: [], responsibleNums: [],
          groupIds: [], status: '', addRecord: '',
          lowerCreateTimeStamp: Date.parse('2026-10-22T00:00:00+08:00'),
          upperCreateTimeStamp: Date.parse('2026-10-23T00:00:00+08:00'),
        }),
      })
      return await r.json()
    },
    { base: BASE, title: `${site}客户` }
  )
  all.push(...(j?.data?.viewPage?.records || []))
}

const expected = JSON.parse(fs.readFileSync('orders-20261022-4shop.json', 'utf8'))
const have = new Set(all.map((r) => `${r.mobileNumber}|${r.title}`))
const missing = expected.filter((o) => !have.has(`${o.contact}|${o.subject}`))
const extra = all.filter((r) => !expected.some((o) => o.contact === r.mobileNumber && o.subject === r.title))

console.log('系统里查到:', all.length, '| 期望:', expected.length)
console.log('缺失:', missing.length)
missing.forEach((o) => console.log('  ✗', o.contact, o.subject))
console.log('多余:', extra.length)

const byContact = {}
all.forEach((r) => (byContact[r.mobileNumber] = (byContact[r.mobileNumber] || 0) + 1))
console.log('按客户账号:', JSON.stringify(byContact))

const bad = all.filter(
  (r) => r.questionTypeView !== '咨询使用' || !r.allLabel?.startsWith('客户管家ERP') || r.belongSystemView !== '客户管家ERP' || r.mobileNumber === ''
)
console.log('字段异常:', bad.length)
bad.slice(0, 8).forEach((r) => console.log('  !', r.code, r.title, r.questionTypeView, r.allLabel, r.mobileNumber))

// 系统类型/渠道应该按模式分
const sysRows = all.filter((r) => r.title.includes('ERP系统实施'))
const platRows = all.filter((r) => r.title.includes('erp对接-平台模式'))
const chk = (rows, st, ch) => rows.filter((r) => r.systemTypeView !== st || r.feedbackChannelView !== ch).length
console.log(`系统模式 ${sysRows.length} 单, 类型/渠道不符: ${chk(sysRows, '其他', '其他')}`)
console.log(`平台模式 ${platRows.length} 单, 类型/渠道不符: ${chk(platRows, 'WEB端', '微信')}`)

await close(ctx)
process.exit(0)
