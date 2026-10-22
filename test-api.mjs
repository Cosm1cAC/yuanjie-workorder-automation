import { pullByTitle } from './api.mjs'
const rows = await pullByTitle('打印机')
console.log('随便拉一下 "打印机":', rows.length)
console.log(rows.slice(0,3).map(r=>`${r.code} ${r.title} | ${r.allLabel}`).join('\n'))
