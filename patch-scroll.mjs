import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')
s = s.replace(
`async function openField(idx) {
  await closePanels()
  const el = page.locator('.label-wrapper').nth(idx).locator('input.com-input-element').first()
  const box = await el.boundingBox()`,
`async function openField(idx) {
  await closePanels()
  const el = page.locator('.label-wrapper').nth(idx).locator('input.com-input-element').first()
  // 字段可能在视口外，先滚进来再量坐标，否则点击落空
  await el.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(80)
  const box = await el.boundingBox()`)
s = s.replace(
`  const okContact = o.contact ? await fillContact(o.contact) : true`,
`  const okContact = o.contact ? await fillContact(o.contact) : true
  if (o.contact) console.log('  用户/联系方式:', okContact ? 'ok' : 'FAIL')`)
fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('ok')
