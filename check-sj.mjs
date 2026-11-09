import { apiPost, ORDER_PAGE } from './api.mjs'
import fs from 'node:fs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'四川成都市三江新区客户', size:100 }))
const recs = j?.data?.viewPage?.records || []
const expected = JSON.parse(fs.readFileSync('orders-20261109-sanjiang.json','utf8'))
const have = new Set(recs.map(r=>`${r.mobileNumber}|${r.title}`))
const missing = expected.filter(o=>!have.has(`${o.contact}|${o.subject}`))
console.log('系统里:', recs.length, '| 缺失:', missing.length)
missing.forEach(o=>console.log('  ✗', o.subject))
const phones={}; recs.forEach(r=>{phones[r.mobileNumber]=(phones[r.mobileNumber]||0)+1})
console.log('联系方式:', JSON.stringify(phones))
