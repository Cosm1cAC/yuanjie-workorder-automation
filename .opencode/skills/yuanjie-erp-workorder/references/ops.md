# 运维：上传台、浏览器、脚本

## 目录

```
圆捷工单/
├── .opencode/skills/yuanjie-erp-workorder/   ← 本 Skill
├── erp-items.json / platform-items.json / offline-items.json   三种模式模板
├── erp-batch.mjs        批量录入主脚本
├── add-workorder.mjs    旧版：填好标签页不保存
├── save-all.mjs         旧版：批量保存并关闭标签页
├── login.mjs            重新扫码登录
├── upload-server.mjs    图片上传服务（零依赖）
├── upload-watchdog.mjs  看门狗：管服务 + 专用 Chrome
├── init-instance.mjs    启动新的常驻 Chrome 并注入登录态
├── 启动图片上传.bat      一键：服务 + 浏览器
├── 停止图片上传.bat      全停
├── public/index.html    上传台前端
├── 图片/                 用户上传的原始截图
└── RULES.md             详细规则
```

## 上传台

- 地址：`http://127.0.0.1:8787`
- 双击 `启动图片上传.bat` 同时起服务(8787)和专用 Chrome(9344)，并打开上传页 + ERP 工单界面(`/workOrder/add`)
- **关掉浏览器 → 服务和看门狗一起退出**，不留残进程
- 要彻底停用 `停止图片上传.bat`
- 看门狗每 3 秒探测 `/api/ping`，服务挂了自动拉起
- 日志：`watchdog.log`

页面功能：拖拽 / `Ctrl+V` 粘贴 / 剪贴板 API 读图 → 选省区（必填）→ 片区、客户名可空 → 实施人默认「四川省区黄俊浍」→ 写说明 → 点「发送给 AI」。

发出的消息格式：

```
【工单任务】
图片：
- 图片/20261022-150239-image.png

省区：四川省区
片区：(空)
客户名：(空)
标题客户名：四川省区客户
实施人：四川省区黄俊浍

说明：前三家按系统模式拆单，最后一家是平台模式
```

## 目标会话必须钉死

- 服务把目标会话写进 `.target-session`
- 优先级：请求参数 > `.target-session` > 环境变量 `OPENCODE_SESSION_ID` > 同目录最近会话
- 页面右下角有会话下拉，可手动切换（会 `POST /api/session` 覆盖钉住值）
- 服务读 `~/.config/opencode/service.json` 拿本地服务地址和密码，**不要把密码写进代码**

## 常驻 Chrome

- 端口 `9344`，用户目录 `.chrome-profile3`
- 启动参数要带四个反节流参数（见 form-pitfalls 坑 10）
- 录单时窗口移到屏幕外（`left:-2400`），不抢焦点
- 自动化连它：`YTO_CDP_PORT=9344 YTO_PROFILE=.chrome-profile3`

## 常用环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `YTO_CDP_PORT` | 9344 | 专用 Chrome 调试端口 |
| `YTO_PROFILE` | .chrome-profile3 | 专用 Chrome 用户目录 |
| `YTO_ERP_URL` | https://yto-agile.yto56.com.cn:7100/workOrder/add | 启动时一并打开的 ERP 页面 |
| `PORT` | 8787 | 上传服务端口 |

## 登录态

- `.auth-state.json` 是 Playwright 的 cookie 快照，**不要提交到公开仓库**
- `.chrome-profile*` 是浏览器用户目录，同样不要提交
- 登录失效时跑 `node login.mjs`，会新开一个标签页等扫码，扫完自动存盘
