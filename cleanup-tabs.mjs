import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
console.log('tabs before:', ctx.pages().length)
const keep = ctx.pages().find(p=>p.url().includes('/workOrder/list')) ?? ctx.pages()[0]
for (const p of ctx.pages()) if (p !== keep) await p.close().catch(()=>{})
console.log('tabs after:', ctx.pages().length, ctx.pages().map(p=>p.url()).join(' | '))
await close(ctx); process.exit(0)
