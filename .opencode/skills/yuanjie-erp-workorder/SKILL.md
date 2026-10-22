---
name: 圆捷 ERP 工单录入
description: 圆捷客服系统（yto-agile.yto56.com.cn）ERP 工单的拆单、批量录入与校验。用户提供钉钉/微信截图并要求「按系统模式/平台模式/线下打单模式拆单」时使用；也用于排查录入失败、重复单、字段填错等问题。
---

# 圆捷 ERP 工单录入

把一张实施截图（客户账号 + 维护网点 + 实施人）拆成多个工单，逐单填进圆捷客服系统。

## 系统要点

| 项 | 值 |
|---|---|
| 新增页 | `https://yto-agile.yto56.com.cn:7100/workOrder/add` |
| 工单列表 | `https://yto-agile.yto56.com.cn:7100/workOrder/list` |
| 详情 | `.../workOrder/detail?workOrderId=<id>` |
| 列表接口 | `POST {BASE}/customerService/workOrder/page` |
| 详情接口 | `GET {BASE}/customerService/workOrder/getById?workOrderId=<id>`（参数名是 `workOrderId`，用 `id=` 会 404） |
| 登录 | SSO + 钉钉扫码，登录态存 `.auth-state.json` |

**接口调用必须在页面上下文里 `fetch`**（`credentials:'include'`），用 Playwright 的 `ctx.request` 会因 `proxy:direct://` 报 ENOTFOUND。

## 三种实施模式

拆单数量差 3~4 倍，**先问清是哪种模式**。

| 模式 | 单数 | 标题格式 | 系统类型 | 反馈渠道 | 时长 | 标签 |
|---|---|---|---|---|---|---|
| 系统模式 | **27** | `{客户名}客户ERP系统实施{功能点}` | 其他 | 其他 | 2~3 min | 逐项不同 |
| 平台模式 | **8** | `{客户名}客户erp对接-平台模式-{功能点}` | WEB端 | 微信 | 10~15 min | 8 单统一一条 |
| 线下打单 | **10** | `{客户名}客户线下打单ERP {功能点}` | WEB端 | 微信 | 10 min | 逐项不同 |

固定字段：`所属系统=客户管家ERP`、`问题分类=咨询使用`、`用户=03744302`、联系方式=客户账号（手机号）。

功能点清单、标签链、解决办法话术见 `references/modes.md`，模板文件在项目根目录：
`erp-items.json`（27 项）、`platform-items.json`（8 项）、`offline-items.json`（10 项）。

## 客户名规则

页面（上传台）会算好「标题客户名」，直接用：

| 输入 | 标题客户名 |
|---|---|
| 客户名有值 | `{客户名}` |
| 客户名为空、片区有值 | `{片区}客户` |
| 都为空 | `{省区}客户`，如 `四川省区客户` |
| 给了网点名 | `{网点名}客户`，如 `乐山市夹江县客户` |

**不拼手机号，不写微信备注里的姓名。**

## 标准流程

1. 读图，取出每家的：客户账号（手机号）、维护网点（客户名）、实施人
2. 判断模式，确认拆单数
3. 生成 orders JSON（脚本 `gen-orders-*.mjs` 是范例）
4. 跑 `node erp-batch.mjs orders.json`
5. 跑校验脚本，按客户账号分组核对数量与字段

## 录入脚本

```bash
node erp-batch.mjs orders.json           # 填一单存一单，主脚本
node erp-batch.mjs orders.json --dry     # 只填不存，用于测速
node erp-batch.mjs orders.json --limit=3
node save-all.mjs                        # 旧脚本：填好的标签页批量保存后关闭
node login.mjs                           # 重新扫码登录
```

`erp-batch.mjs` 行为：全程只用一个标签页、开跑前关掉多余标签、窗口移到屏幕外不抢焦点（不是无头）、填完即存、跑前扫描系统已有单自动跳过、**约 10~12 秒/单**。

## 硬性要求

- **只填表和保存，绝不擅自改动已存在的工单**（没有删除接口）
- 保存前先确认登录态有效（URL 不在 `sso.yto56.com.cn`）
- 大批量（>20 单）要后台跑并看日志，不要前台等

## 必踩的坑

见 `references/form-pitfalls.md`，重点：

1. 标签页必须是**活动页**，否则点「保存工单」毫无反应
2. 表单未保存时导航会弹 beforeunload，必须 `page.on('dialog', d => d.accept())`
3. 上一个下拉的浮层会盖住下一个字段，点前先 `closePanels()`
4. 填完下拉后要重新量坐标（`scrollIntoView` + 等 220ms）
5. 标签级联按**列号**取列，不要取最后一列
6. `page.goto` 会被打断，导航要重试；导航前先重置表单

## 上传台（收图 + 发指令）

```bash
# 一键起服务 + 专用浏览器：双击 启动图片上传.bat
# 全部停：双击 停止图片上传.bat
```

浏览器关掉 → 服务和看门狗一起退出。页面地址 `http://127.0.0.1:8787`，
支持拖拽 / `Ctrl+V` 粘贴 / 剪贴板 API 读图，写说明后点「发送给 AI」，
消息会以 `【工单任务】` 形式推进 OpenCode 会话。详见 `references/ops.md`。
