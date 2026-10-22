const pw = 'vibelink-4b248bee52bd448185bd'
const auth = 'Basic ' + Buffer.from('opencode:' + pw).toString('base64')
const spec = await (await fetch('http://127.0.0.1:4599/openapi.json', { headers: { Authorization: auth } })).json()
console.log('=== 所有 workOrder 相关接口 ===')
for (const [p, methods] of Object.entries(spec.paths)) {
  if (!/workorder/i.test(p)) continue
  const ms = Object.keys(methods).filter(m=>['get','post','put','patch','delete'].includes(m)).map(m=>m.toUpperCase())
  console.log(`  ${ms.join(',').padEnd(22)} ${p}`)
}
