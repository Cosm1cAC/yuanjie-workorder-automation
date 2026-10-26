import fs from 'node:fs'
let s = fs.readFileSync('lib/preflight.mjs','utf8')
s = s.replace(
`import { execSync, spawn } from 'node:child_process'`,
`import { chromium } from 'playwright'
import { execSync, spawn } from 'node:child_process'`)
s = s.replace(
`async function ok(url, ms = 2000) {`,
`/** 光看 /json/version 不够：WS 握手可能卡住，必须真连一次 */
async function cdpUsable(ms = 6000) {
  try {
    const b = await chromium.connectOverCDP(\`http://127.0.0.1:\${CDP_PORT}\`, { timeout: ms })
    await b.close()
    return true
  } catch {
    return false
  }
}

async function ok(url, ms = 2000) {`)
s = s.replace(
`  let cdp = await ok(\`http://127.0.0.1:\${CDP_PORT}/json/version\`, 2500)`,
`  let cdp = await cdpUsable()`)
s = s.replace(
`  cdp = await waitFor(\`http://127.0.0.1:\${CDP_PORT}/json/version\`, 40000)`,
`  cdp = await waitFor(\`http://127.0.0.1:\${CDP_PORT}/json/version\`, 40000)
  if (cdp) cdp = await cdpUsable(8000)`)
fs.writeFileSync('lib/preflight.mjs', s, 'utf8')
console.log('ok')
