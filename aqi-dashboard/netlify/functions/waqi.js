const WAQI_API_BASE_URL = 'https://api.waqi.info'

function sendJson(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

function isAllowedPath(path) {
  return /^feed\/(?:geo:[^?]+|@\d+)\/?$/.test(path)
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return sendJson(405, { error: 'Method not allowed' })
  }

  const token = process.env.WAQI_API_TOKEN
  if (!token) {
    return sendJson(500, { error: 'Missing WAQI_API_TOKEN' })
  }

  const path = event.queryStringParameters?.path?.trim() ?? ''
  if (!path || !isAllowedPath(path)) {
    return sendJson(400, { error: 'Invalid WAQI path' })
  }

  const upstream = new URL(path, WAQI_API_BASE_URL)
  upstream.searchParams.set('token', token)

  try {
    const response = await fetch(upstream.toString(), { method: 'GET' })
    const text = await response.text()

    return {
      statusCode: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
      body: text,
    }
  } catch (error) {
    return sendJson(502, {
      error: 'Failed to reach WAQI',
      message: error instanceof Error ? error.message : 'Unknown proxy failure',
    })
  }
}
