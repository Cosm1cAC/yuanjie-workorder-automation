import { connect, close } from './lib/browser.mjs'
const ctx = await connect()
console.log('pages:')
ctx.pages().forEach((p,i)=>console.log(` [${i}] ${p.url()}`))
await close(ctx); process.exit(0)
