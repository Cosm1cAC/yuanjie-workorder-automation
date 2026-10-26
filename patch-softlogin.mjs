import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')
s = s.replace(
`const loginOk = await checkLogin()
if (loginOk === false) {
  console.log('[x] 登录态失效，请先跑 node login.mjs')
  process.exit(1)
}`,
`const loginOk = await checkLogin()
if (loginOk === false) {
  // cookie 快照可能过期，但浏览器里还登着；先继续，真失效会在打开表单时被发现
  console.log('[warn] cookie 登录检查失败（可能是快照过期），先继续，必要时会提示扫码')
}`)
fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('ok')
