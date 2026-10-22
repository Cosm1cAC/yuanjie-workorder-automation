// 圆捷工单 · 图片上传小服务
// 用途：浏览器里拖拽 / 粘贴 / 选择图片，直接落到 圆捷工单\图片 目录，
// 方便把路径交给 AI 读取。
//
// 启动：node upload-server.mjs
// 访问：http://127.0.0.1:8787
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGE_DIR = path.join(__dirname, '图片')
const PUBLIC_DIR = path.join(__dirname, 'public')
const PORT = Number(process.env.PORT || 8787)

// ---- OpenCode 本地服务（把「图片 + 指令」直接发进当前会话）----
function readOcService() {
  const p = path.join(process.env.USERPROFILE || '', '.config', 'opencode', 'service.json')
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'))
    return { base: `http://${j.hostname || '127.0.0.1'}:${j.port || 4599}`, password: j.password || '' }
  } catch {
    return null
  }
}

const OC = readOcService()
const TARGET_FILE = path.join(__dirname, '.target-session')

function ocAuth() {
  return 'Basic ' + Buffer.from(`opencode:${OC?.password || ''}`).toString('base64')
}

async function ocFetch(pathname, options = {}) {
  if (!OC) throw new Error('找不到 ~/.config/opencode/service.json')
  const r = await fetch(OC.base + pathname, {
    ...options,
    headers: { Authorization: ocAuth(), 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!r.ok) throw new Error(`OpenCode API ${r.status}`)
  const text = await r.text()
  return text ? JSON.parse(text) : null
}

/**
 * 目标会话（钉在文件里，避免发错会话）：
 *   1. 请求显式指定
 *   2. .target-session 里钉的
 *   3. 环境变量 OPENCODE_SESSION_ID
 *   4. 同一目录最近更新的会话（并把结果钉住）
 */
function readPinned() {
  try {
    const v = fs.readFileSync(TARGET_FILE, 'utf8').trim()
    return v || null
  } catch {
    return null
  }
}
function pinSession(id) {
  try {
    fs.writeFileSync(TARGET_FILE, id, 'utf8')
  } catch {}
}

async function resolveSession(explicit) {
  if (explicit) return explicit
  const pinned = readPinned()
  if (pinned) return pinned
  if (process.env.OPENCODE_SESSION_ID) {
    pinSession(process.env.OPENCODE_SESSION_ID)
    return process.env.OPENCODE_SESSION_ID
  }

  const j = await ocFetch('/api/session')
  const list = (Array.isArray(j) ? j : j?.data || []).filter((s) => s?.id)
  if (!list.length) throw new Error('没有可用会话')

  const norm = (p) => String(p || '').replace(/[\\/]+/g, '\\').toLowerCase()
  const here = norm(__dirname)
  const time = (s) => s.time?.updated || s.time?.created || 0

  const sameDir = list
    .filter((s) => norm(s.location?.directory) === here)
    .sort((a, b) => time(b) - time(a))
  const picked = sameDir.length ? sameDir[0].id : list.sort((a, b) => time(b) - time(a))[0].id
  pinSession(picked)
  return picked
}

fs.mkdirSync(IMAGE_DIR, { recursive: true })

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
}

const SAFE_EXT = new Set(Object.keys(MIME))

function json(res, code, data) {
  const body = JSON.stringify(data)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

/** 只允许访问 图片 目录内的文件 */
function safeName(name) {
  const base = path.basename(String(name || ''))
  return base.replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 120)
}

function uniqueName(original) {
  const ext = path.extname(original).toLowerCase()
  const stem = path.basename(original, path.extname(original)).replace(/[\\/:*?"<>|\r\n]/g, '_').slice(0, 60) || 'image'
  const d = new Date()
  const pad = (n, l = 2) => String(n).padStart(l, '0')
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  let name = `${stamp}-${stem}${ext}`
  let i = 1
  while (fs.existsSync(path.join(IMAGE_DIR, name))) {
    name = `${stamp}-${stem}-${i++}${ext}`
  }
  return name
}

function listImages() {
  const files = fs
    .readdirSync(IMAGE_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && SAFE_EXT.has(path.extname(d.name).toLowerCase()))
    .map((d) => {
      const full = path.join(IMAGE_DIR, d.name)
      const st = fs.statSync(full)
      return {
        name: d.name,
        rel: `图片/${d.name}`,
        size: st.size,
        mtime: st.mtimeMs,
        url: `/images/${encodeURIComponent(d.name)}`,
      }
    })
    .sort((a, b) => b.mtime - a.mtime)
  return files
}

function serveStatic(req, res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '')
  const full = path.join(PUBLIC_DIR, rel)
  if (!full.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'forbidden' })
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return json(res, 404, { error: 'not found' })
  const ext = path.extname(full).toLowerCase()
  const type =
    ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
  fs.createReadStream(full).pipe(res)
}

function serveImage(req, res, name) {
  const base = safeName(decodeURIComponent(name))
  const full = path.join(IMAGE_DIR, base)
  if (!full.startsWith(IMAGE_DIR) || !fs.existsSync(full)) return json(res, 404, { error: 'not found' })
  const ext = path.extname(full).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'max-age=60',
  })
  fs.createReadStream(full).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const p = url.pathname

  try {
    // 在专用 Chrome 里打开上传页
    if (p === '/api/open' && req.method === 'GET') {
      const cdp = Number(process.env.YTO_CDP_PORT || 9344)
      const url = `http://127.0.0.1:${PORT}/`
      try {
        const list = await (await fetch(`http://127.0.0.1:${cdp}/json/list`)).json()
        const has = list.some((t) => t.type === 'page' && t.url.startsWith(url))
        if (!has) {
          await fetch(`http://127.0.0.1:${cdp}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
        }
        return json(res, 200, { ok: true, cdp, opened: !has })
      } catch (e) {
        return json(res, 200, { ok: false, error: String(e.message) })
      }
    }

    if (p === '/api/ping' && req.method === 'GET') {
      return json(res, 200, { ok: true, pid: process.pid, uptime: Math.round(process.uptime()) })
    }

    if (p === '/api/list' && req.method === 'GET') {
      return json(res, 200, { ok: true, dir: IMAGE_DIR, images: listImages() })
    }

    if (p === '/api/upload' && req.method === 'POST') {
      const rawName = url.searchParams.get('name') || 'image.png'
      const original = safeName(rawName)
      const ext = path.extname(original).toLowerCase()
      if (!SAFE_EXT.has(ext)) return json(res, 400, { error: `不支持的格式：${ext || '无扩展名'}` })

      const chunks = []
      let size = 0
      const LIMIT = 30 * 1024 * 1024
      for await (const chunk of req) {
        size += chunk.length
        if (size > LIMIT) return json(res, 413, { error: '文件超过 30MB' })
        chunks.push(chunk)
      }
      if (!size) return json(res, 400, { error: '空文件' })

      const name = uniqueName(original)
      fs.writeFileSync(path.join(IMAGE_DIR, name), Buffer.concat(chunks))
      const st = fs.statSync(path.join(IMAGE_DIR, name))
      return json(res, 200, {
        ok: true,
        image: { name, rel: `图片/${name}`, size: st.size, mtime: st.mtimeMs, url: `/images/${encodeURIComponent(name)}` },
      })
    }

    // 把「图片路径 + 指令」发进 OpenCode 会话
    if (p === '/api/send' && req.method === 'POST') {
      const body = await new Promise((resolve) => {
        let s = ''
        req.on('data', (c) => (s += c))
        req.on('end', () => resolve(s))
      })
      const { text, session } = JSON.parse(body || '{}')
      if (!text || !String(text).trim()) return json(res, 400, { error: '指令为空' })
      if (!OC) return json(res, 500, { error: '找不到 OpenCode service.json' })
      const sessionID = await resolveSession(session)
      const out = await ocFetch(`/api/session/${sessionID}/prompt`, {
        method: 'POST',
        body: JSON.stringify({ text: String(text) }),
      })
      return json(res, 200, { ok: true, session: sessionID, message: out?.data?.id || out?.id || null })
    }

    // 查询当前会连接哪个会话，给页面显示
    if (p === '/api/session' && req.method === 'GET') {
      if (!OC) return json(res, 200, { ok: false, error: '未找到 OpenCode 服务' })
      const id = await resolveSession(url.searchParams.get('session') || undefined)
      return json(res, 200, {
        ok: true,
        session: id,
        pinned: readPinned(),
        env: process.env.OPENCODE_SESSION_ID || null,
      })
    }

    // 手动切换目标会话
    if (p === '/api/session' && req.method === 'POST') {
      const body = await new Promise((resolve) => {
        let s = ''
        req.on('data', (c) => (s += c))
        req.on('end', () => resolve(s))
      })
      const id = JSON.parse(body || '{}').session
      if (!id) return json(res, 400, { error: '缺少 session' })
      pinSession(id)
      return json(res, 200, { ok: true, session: id })
    }

    // 最近的会话列表，供页面选择
    if (p === '/api/sessions' && req.method === 'GET') {
      if (!OC) return json(res, 200, { ok: false, error: '未找到 OpenCode 服务' })
      const j = await ocFetch('/api/session')
      const list = (Array.isArray(j) ? j : j?.data || [])
        .filter((s) => s?.id)
        .map((s) => ({
          id: s.id,
          title: s.title || '(无标题)',
          updated: s.time?.updated || s.time?.created || 0,
          dir: s.location?.directory || '',
        }))
        .sort((a, b) => b.updated - a.updated)
        .slice(0, 30)
      return json(res, 200, { ok: true, sessions: list })
    }

    if (p === '/api/delete' && req.method === 'POST') {
      const body = await new Promise((resolve) => {
        let s = ''
        req.on('data', (c) => (s += c))
        req.on('end', () => resolve(s))
      })
      const name = safeName(JSON.parse(body || '{}').name)
      const full = path.join(IMAGE_DIR, name)
      if (!full.startsWith(IMAGE_DIR) || !fs.existsSync(full)) return json(res, 404, { error: '文件不存在' })
      fs.unlinkSync(full)
      return json(res, 200, { ok: true })
    }

    if (p.startsWith('/images/')) return serveImage(req, res, p.slice('/images/'.length))

    return serveStatic(req, res, p)
  } catch (e) {
    console.error(e)
    return json(res, 500, { error: String(e.message || e) })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[圆捷工单] 图片上传服务已启动: http://127.0.0.1:${PORT}`)
  console.log(`[圆捷工单] 图片保存目录: ${IMAGE_DIR}`)
})