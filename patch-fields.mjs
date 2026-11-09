import fs from 'node:fs'
let s = fs.readFileSync('public/index.html','utf8')

// 1) CSS：可折叠字段
s = s.replace(
'  .meta-form .full{grid-column:1 / -1;}',
'  .meta-form .full{grid-column:1 / -1;}\n  .erp-only.hide{display:none !important;}')

// 2) 给 ERP 专用字段加 class
s = s.replace(
`        <div>
          <label>省区 <span class="req">*</span></label>`,
`        <div class="erp-only">
          <label>省区 <span class="req">*</span></label>`)
s = s.replace(
`        <div>
          <label>片区</label>`,
`        <div class="erp-only">
          <label>片区</label>`)
s = s.replace(
`        <div>
          <label>客户名</label>`,
`        <div class="erp-only">
          <label>客户名</label>`)
s = s.replace(
`        <div>
          <label>客户电话 <span class="req" id="phoneReq" style="display:none">*</span></label>`,
`        <div class="erp-only">
          <label>客户电话 <span class="req" id="phoneReq" style="display:none">*</span></label>`)
s = s.replace(
`          <label>网点 / 位置</label>`,
`          <label>网点 / 位置 <span class="req" id="siteReq" style="display:none">*</span></label>`)
s = s.replace(
`        <div class="full preview-line">标题客户名：<b id="namePreview">—</b></div>`,
`        <div class="full preview-line erp-only">标题客户名：<b id="namePreview">—</b></div>`)

fs.writeFileSync('public/index.html', s, 'utf8')
console.log('fields tagged')
