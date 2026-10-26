import fs from 'node:fs'
let s = fs.readFileSync('erp-batch.mjs','utf8')
s = s.replace(
`const DRY = process.argv.includes('--dry')`,
`const DRY = process.argv.includes('--dry')
// --show：不把窗口挪走，你可以全程盯着看
const SHOW = process.argv.includes('--show')`)
s = s.replace(
`await parkWindow()
process.on('SIGINT'`,
`if (SHOW) console.log('[*] --show：窗口保持可见，不挪走')
else await parkWindow()
process.on('SIGINT'`)
fs.writeFileSync('erp-batch.mjs', s, 'utf8')
console.log('ok')
