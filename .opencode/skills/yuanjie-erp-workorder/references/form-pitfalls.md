# 录入踩坑清单

每一条都真实踩过，对应症状 → 原因 → 修法。

## 1. 标签页在后台 → 点「保存工单」毫无反应

- 症状：每单等满 20s 超时，单均 60s+，日志全是「保存未跳转」
- 原因：后台标签页里点击不触发组件逻辑（不发请求、不跳转、不报错）
- 修法：`goto` 之后和 `saveOrder()` 之前各调一次 `page.bringToFront()`
  - 窗口仍移到屏幕外，所以不会抢焦点
  - 反过来：**看门狗不能自动补开上传页**，新建标签会把录单标签页挤到后台

## 2. beforeunload 弹窗把整批卡死

- 症状：跑 15 分钟零产出
- 原因：上一个表单没保存就导航，Chrome 弹「确定离开吗」
- 修法：`page.on('dialog', d => d.accept())` + 导航前先 `resetForm()`

## 3. 浮层盖住下一个字段 → 字段被改错

- 症状：选完标签后「所属系统」变成「行者」；「问题分类」空着
- 原因：上一个下拉的选项面板还开着，点击落到选项上
- 修法：每次点字段前 `closePanels()`（按 Esc 直到 `.com-popover-content` 不可见）

## 4. 坐标偏移 → 点到相邻项

- 症状：想选「客户管家ERP」结果选中「行者」
- 原因：`scrollIntoView` 后列表还在滚动动画中，量的坐标是旧的
- 修法：先 scroll，等 220ms 再 `getBoundingClientRect()`，然后点

## 5. 标签级联取错列

- 症状：点第一级「客户管家ERP」提示「本级无此选项」，可见项只有「SRM系统对接管理」
- 原因：树有多列时取「最后一列」，其实是上一次的残留层级
- 修法：按**列号**取列（第 i 级取第 i 列），列不够就等它展开

## 6. 草稿回填

- 症状：打开新增页，标签栏已经有值；标签树直接展开到第 6 列
- 原因：表单草稿存在 `localStorage.ADD_WORKORDER_KEY`，加载时自动回填
- 修法：导航前 `localStorage.removeItem('ADD_WORKORDER_KEY')`

## 7. 保存成功但脚本以为失败 → 重复单

- 症状：同一单出现两条（例：G20261022000293 与 G20261022000393）
- 原因：保存其实成功了，但页面跳转被 ERR_ABORTED 打断，脚本判为失败并重试
- 修法：
  - `page.goto` 加重试（4 次，间隔 900ms）
  - **跑前扫描系统已有单**，同（联系方式+标题）直接跳过
- 已有重复单无法删除（没有 DELETE 接口，详情页只有 修改/需求升级），需人工处理

## 8. 「所属系统」是「行者」而不是目标值

见坑 3、坑 4。修完后必须逐字段校验 `innerText` 是否包含目标值，不通过就重试。

## 9. ERP 单的「用户」变成「联系方式」

- 症状：填完「用户」，右侧变成「联系方式」且为空
- 原因：选了 `客户管家ERP` + 标签后，组件把「用户」栏重建成「联系方式」
- 修法：**先选所属系统和标签，最后再填联系方式**（填客户注册手机号，不打码）

## 10. 窗口移出屏幕后被 Chrome 节流

- 症状：移出屏幕后打开表单要 20s（原来 3s），下拉点击全歪
- 原因：Chrome 把屏幕外的窗口判定为「被遮挡」，降频渲染
- 修法：启动 Chrome 时加
  `--disable-background-timer-throttling --disable-backgrounding-occluded-windows
   --disable-renderer-backgrounding --disable-features=CalculateNativeWinOcclusion`
- **不要用 `windowState:'minimized'`**：最小化后下拉面板坐标全算错

## 11. 代理必须绕过

本机 mihomo 在 `127.0.0.1:7897`，但环境变量 `HTTPS_PROXY` 指向不通的 `192.168.86.20:7898`。
圆捷必须直连：Chrome 加 `--no-proxy-server`，Playwright 用 `proxy: { server: 'direct://' }`。

## 12. 工单删不掉

已从三个角度确认，**圆捷客服系统没有删除工单的能力**：

- 前端包 `static/js/index.a92c1314.js` 里 workOrder 相关接口只有
  `insert / update / queryDetail / endWithUpdate / hand / activeOrder / getEmployeeByUserCode`，
  没有任何 delete / remove / cancel
- 列表页无操作列（33 列最后是「处理组」），批量工具栏只有 新建工单 / 导出 / 转派
- 详情页只有 修改 / 需求升级，「修改」面板里只有 重置 / 保存工单

处理办法：

- 重复单用「修改」把标题改成 `（重复单）xxx` 标记出来，统计上能辨认，但单数还在
- 真要清掉只能找工单质检 / 主管 / 系统管理员
- **所以更要把重复挡在前面**：`erp-batch.mjs` 开跑前会扫描系统里已有的
  （联系方式+标题），命中就跳过
