import { defineConfig, loadEnv } from 'vite'

const WAQI_API_BASE_URL = 'https://api.waqi.info'
const WAQI_PROXY_PATH = '/.netlify/functions/waqi'
const WAQI_ALLOWED_PATH = /^feed\/(?:geo:[^?]+|@\d+)\/?$/

function createJsonResponder(res) {
  return (statusCode, body) => {
    res.statusCode = statusCode
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(JSON.stringify(body))
  }
}

function createWaqiMiddleware(env) {
  const sendJson = createJsonResponder
  const token = (env.WAQI_API_TOKEN || env.VITE_WAQI_API_TOKEN || '').trim()

  return async function waqiMiddleware(req, res, next) {
    const requestUrl = new URL(req.url || '', 'http://localhost')
    if (requestUrl.pathname !== WAQI_PROXY_PATH) {
      next()
      return
    }

    if (req.method !== 'GET') {
      sendJson(res)(405, { error: 'Method not allowed' })
      return
    }

    if (!token) {
      sendJson(res)(500, { error: 'Missing WAQI_API_TOKEN' })
      return
    }

    const path = requestUrl.searchParams.get('path')?.trim() ?? ''
    if (!path || !WAQI_ALLOWED_PATH.test(path)) {
      sendJson(res)(400, { error: 'Invalid WAQI path' })
      return
    }

    const upstream = new URL(path, WAQI_API_BASE_URL)
    upstream.searchParams.set('token', token)

    try {
      const response = await fetch(upstream.toString(), { method: 'GET' })
      const text = await response.text()

      res.statusCode = response.status
      res.setHeader('content-type', response.headers.get('content-type') || 'application/json; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.end(text)
    } catch (error) {
      sendJson(res)(502, {
        error: 'Failed to reach WAQI',
        message: error instanceof Error ? error.message : 'Unknown proxy failure',
      })
    }
  }
}

function waqiProxyPlugin(env) {
  const middleware = createWaqiMiddleware(env)

  return {
    name: 'waqi-dev-proxy',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    cacheDir: 'C:/tmp/aqi-dashboard-vite-cache',
    plugins: [waqiProxyPlugin(env)],
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: 'localhost',
      port: 4173,
      strictPort: true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('leaflet') || id.includes('react-leaflet')) {
                return 'leaflet'
              }

              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'charts'
              }
            }
          },
        },
      },
    },
  }
})
