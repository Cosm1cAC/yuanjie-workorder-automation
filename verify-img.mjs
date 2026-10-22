import { apiPost, apiGet, ORDER_PAGE } from './api.mjs'
const j = await apiPost('/customerService/workOrder/page', ORDER_PAGE({ title:'打印机卡纸', responsibleNums:['03744302'] }))
const r = (j?.data?.viewPage?.records||[])[0]
console.log('id=', r.id)
const d = await apiGet(`/customerService/workOrder/getById?workOrderId=${r.id}`)
const data = d?.data || {}
const keys = Object.keys(data).filter(k=>/img|image|pic|file|attach|solve/i.test(k))
console.log('相关字段:', keys.join(','))
keys.forEach(k=>console.log(`  ${k} =`, JSON.stringify(data[k]).slice(0,300)))
