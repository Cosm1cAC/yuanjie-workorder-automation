// 直接调圆捷接口（不经过浏览器）：用 .auth-state.json 里的 cookie
// 分析类任务优先用它，比 CDP 稳定得多
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const BASE = 'https://yto-agile.yto56.com.cn:7100'

function cookieHeader() {
  const st = JSON.parse(fs.readFileSync(path.join(__dirname, '.auth-state.json'), 'utf8'))
  return st.cookies
    .filter((c) => /yto56\.com\.cn|yto\.net\.cn|dingtalk/.test(c.domain))
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

export async function apiPost(p, body) {
  const r = await fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieHeader() },
    body: JSON.stringify(body),
  })
  const text = await r.text()
  if (r.status === 401 || /Full authentication/i.test(text)) throw new Error('登录态失效，请跑 node login.mjs')
  return JSON.parse(text)
}

export async function apiGet(p) {
  const r = await fetch(BASE + p, { headers: { Cookie: cookieHeader() } })
  const text = await r.text()
  if (r.status === 401 || /Full authentication/i.test(text)) throw new Error('登录态失效，请跑 node login.mjs')
  return JSON.parse(text)
}

export const ORDER_PAGE = (opts = {}) => ({
  current: 1,
  size: 100,
  tab: '',
  code: '',
  title: '',
  systemName: '',
  labels: [],
  type: '',
  questionType: '',
  systemType: '',
  feedbackChannel: '',
  userNums: [],
  responsibleNums: [],
  groupIds: [],
  status: '',
  addRecord: '',
  lowerCreateTimeStamp: Date.parse('2024-01-01T00:00:00+08:00'),
  upperCreateTimeStamp: Date.parse('2026-12-31T23:59:59+08:00'),
  ...opts,
})

/** 按标题关键字拉全量（翻页） */
export async function pullByTitle(keyword, extra = {}) {
  const out = new Map()
  for (let cur = 1; cur <= 60; cur++) {
    const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title: keyword, current: cur, ...extra }))
    const recs = j?.data?.viewPage?.records || []
    recs.forEach((r) => out.set(r.code, r))
    if (recs.length < 100) break
  }
  return [...out.values()]
}
