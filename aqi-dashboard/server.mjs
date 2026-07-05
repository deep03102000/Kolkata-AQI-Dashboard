import { createReadStream, promises as fs } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const distRoot = path.resolve(distDir)
const port = Number.parseInt(process.env.PORT ?? '10000', 10)
const WAQI_API_BASE_URL = 'https://api.waqi.info'
const WAQI_ALLOWED_PATH = /^feed\/(?:geo:[^?]+|@\d+)\/?$/

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

function sendFile(res, filePath) {
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  res.statusCode = 200
  res.setHeader('content-type', contentType)
  res.setHeader('cache-control', filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable')
  const stream = createReadStream(filePath)
  stream.on('error', () => {
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Failed to read file' })
      return
    }

    res.destroy()
  })
  stream.pipe(res)
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

async function resolveStaticFile(requestPath) {
  let decodedPath = requestPath
  try {
    decodedPath = decodeURIComponent(requestPath)
  } catch {
    return null
  }

  const normalizedPath = decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`
  const relativePath = normalizedPath === '/' ? 'index.html' : normalizedPath.slice(1)

  if (relativePath.includes('..')) {
    return null
  }

  const candidatePath = path.resolve(distRoot, relativePath)
  if (candidatePath !== distRoot && !candidatePath.startsWith(`${distRoot}${path.sep}`)) {
    return null
  }

  if (await fileExists(candidatePath)) {
    return candidatePath
  }

  if (normalizedPath.endsWith('/') || !path.extname(normalizedPath)) {
    const fallbackPath = path.join(distRoot, 'index.html')
    return (await fileExists(fallbackPath)) ? fallbackPath : null
  }

  return null
}

async function handleWaqiProxy(req, res, requestUrl) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const token = process.env.WAQI_API_TOKEN?.trim() ?? ''
  if (!token) {
    sendJson(res, 500, { error: 'Missing WAQI_API_TOKEN' })
    return
  }

  const pathValue = requestUrl.searchParams.get('path')?.trim() ?? ''
  if (!pathValue || !WAQI_ALLOWED_PATH.test(pathValue)) {
    sendJson(res, 400, { error: 'Invalid WAQI path' })
    return
  }

  const upstream = new URL(pathValue, WAQI_API_BASE_URL)
  upstream.searchParams.set('token', token)

  try {
    const response = await fetch(upstream.toString(), { method: 'GET' })
    const body = await response.text()

    res.statusCode = response.status
    res.setHeader('content-type', response.headers.get('content-type') || 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(body)
  } catch (error) {
    sendJson(res, 502, {
      error: 'Failed to reach WAQI',
      message: error instanceof Error ? error.message : 'Unknown proxy failure',
    })
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (requestUrl.pathname === '/api/waqi' || requestUrl.pathname === '/api/waqi/') {
    await handleWaqiProxy(req, res, requestUrl)
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const filePath = await resolveStaticFile(requestUrl.pathname)
  if (!filePath) {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  if (req.method === 'HEAD') {
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    res.statusCode = 200
    res.setHeader('content-type', contentType)
    res.end()
    return
  }

  sendFile(res, filePath)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Render server listening on port ${port}`)
})