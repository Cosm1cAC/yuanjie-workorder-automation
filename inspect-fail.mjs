import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
const page = ctx.pages().find(p=>p.url().includes('/workOrder')) ?? ctx.pages()[0]
console.log('URL:', page.url())
console.log(await page.evaluate(()=>{
  const w=[...document.querySelectorAll('.label-wrapper')]
  const g=(i)=>{const el=w[i]?.querySelector('input'); return el?el.value:'(no)'}
  return [
    '系统: '+g(6),
    '标签: '+(w[7]?.innerText||'').replace(/\s+/g,' ').slice(0,90),
    '分类: '+g(8),
    '类型: '+g(9),
    '渠道: '+g(10),
    '时长: '+g(11),
    '第12栏: '+(w[12]?.innerText||'').replace(/\s+/g,' ').slice(0,40)+' | val='+g(12),
    '文本域: '+[...document.querySelectorAll('.com-textarea-element')].map(t=>t.value.slice(0,20)).join(' || '),
  ].join('\n')
}))
console.log('提示:', await page.evaluate(()=>[...document.querySelectorAll('[class*=toast],[class*=message],[class*=tip]')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,4)))
await close(ctx); process.exit(0)
