import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')

// 1) 解决图片
s = s.replace(
`  if (o.solution) await ta.nth(2).fill(o.solution)`,
`  if (o.solutionImage) {
    await page.locator('input[type=file]').nth(1).setInputFiles(o.solutionImage)
    await page.waitForTimeout(400)
  }
  if (o.solution) await ta.nth(2).fill(o.solution)`)

// 2) 用户/联系方式自适应
s = s.replace(
`async function fillContact(phone) {
  const wrap = page.locator('.label-wrapper').nth(W.contact)
  const inp = wrap.locator('input.com-input-element').first()
  if (!(await inp.count())) return false
  await inp.fill(String(phone))
  await page.waitForTimeout(150)
  return (await inp.inputValue()).replace(/\\s/g, '') === String(phone)
}`,
`async function fillContact(value) {
  const wrap = page.locator('.label-wrapper').nth(W.contact)
  const labelName = await wrap.locator('.label-name').innerText().catch(() => '')
  const inp = wrap.locator('input.com-input-element').first()
  if (!(await inp.count())) return false

  // ERP 单是「联系方式」：直接填手机号
  if (/联系方式/.test(labelName)) {
    await inp.fill(String(value))
    await page.waitForTimeout(150)
    return (await inp.inputValue()).replace(/\\s/g, '') === String(value)
  }

  // 普通单是「用户」：异步搜索，键盘选中
  await openField(W.contact)
  await inp.fill(String(value))
  await page.waitForTimeout(2600)
  const has = await page.evaluate(() =>
    [...document.querySelectorAll('li.com-realtime-async-request-li')].some((e) => e.offsetParent !== null)
  )
  if (!has) return false
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1400)
  const back = await page.evaluate(
    (i) => (document.querySelectorAll('.label-wrapper')[i]?.innerText || '').replace(/\\s+/g, ' ').trim(),
    W.contact
  )
  return /[一-龥]/.test(back) && !back.includes('请选择')
}`)

fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('patched')
