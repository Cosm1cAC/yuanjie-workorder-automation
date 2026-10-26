# 圆捷 ERP 工单录入自动化

把实施截图（客户账号 / 维护网点 / 实施人）自动拆成多个圆捷客服工单并录入系统。

- 目标系统：<https://yto-agile.yto56.com.cn:7100/workOrder/add>
- 三种实施模式：**系统模式 27 单** / **平台模式 8 单** / **线下打单 10 单**
- 自带图片上传台：浏览器里贴图 + 写说明，一键把任务推给 AI

## 快速开始

```bash
npm install          # 只装 playwright
npx playwright install chrome   # 若本机没有 Chrome

# 1) 登录（弹出 Chrome，扫钉钉码）
node login.mjs

# 2) 启动上传台（服务 + 专用浏览器）
启动图片上传.bat
#    → 上传页 http://127.0.0.1:8787
#    → ERP 工单界面 https://yto-agile.yto56.com.cn:7100/workOrder/add
```

## 录单

```bash
node erp-batch.mjs orders.json           # 填一单存一单
node erp-batch.mjs orders.json --dry     # 只填不存（测速）
node erp-batch.mjs orders.json --limit=3
```

`orders.json` 结构：

```json
[
  {
    "subject": "四川省区客户ERP系统实施订单审核",
    "description": "同主题",
    "solution": "微信语音培训完成。",
    "image": "图片/xxx.png",
    "system": "客户管家ERP",
    "tagPath": ["客户管家ERP", "电商用户", "订单管理", "审核订单", "审核订单", "审核订单"],
    "category": "咨询使用",
    "systemType": "其他",
    "channel": "其他",
    "contact": "13900000000",
    "duration": 3
  }
]
```

功能点清单与标签链见 `erp-items.json` / `platform-items.json` / `offline-items.json`。

## 目录

| 路径 | 说明 |
|---|---|
| `.opencode/skills/yuanjie-erp-workorder/` | OpenCode Skill：完整工作流与踩坑清单 |
| `erp-batch.mjs` | 批量录入主脚本（单标签、屏幕外、填完即存、约 10s/单） |
| `upload-server.mjs` / `upload-watchdog.mjs` | 上传服务与看门狗 |
| `public/index.html` | 上传台前端（圆捷紫色系） |
| `RULES.md` | 详细规则 |
| `图片/` | 用户上传的原始截图（本地数据，不入库） |

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `YTO_CDP_PORT` | 9344 | 专用 Chrome 调试端口 |
| `YTO_PROFILE` | `.chrome-profile3` | 专用 Chrome 用户目录 |
| `YTO_ERP_URL` | `https://yto-agile.yto56.com.cn:7100/workOrder/add` | 启动时一并打开的 ERP 页面 |
| `PORT` | 8787 | 上传服务端口 |

## 注意

- 只填表和保存，**不会删除或修改已有工单**（系统没有删除接口）
- 目标会话钉在 `.target-session`，可在上传台右下角切换
- 敏感文件（`.auth-state.json`、`.chrome-profile*`、`图片/`）不会进仓库

## License

MIT
