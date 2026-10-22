import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')

// 保存后落在列表页，用 SPA 的“新建工单”进入，省掉整页重载
s = s.replace(
`async function resetForm() {`,
`/** 从列表页直接进新增页（SPA 跳转，比整页 reload 快 2 秒多） */
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

async function resetForm() {`)

s = s.replace(
`    await gotoAdd()
    await page.waitForSelector('.label-wrapper', { timeout: 20000 })`,
`    await openAdd()
    await page.waitForSelector('.label-wrapper', { timeout: 20000 })`)

fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('ok')
