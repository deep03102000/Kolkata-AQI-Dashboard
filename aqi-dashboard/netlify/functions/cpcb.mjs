import { getCpcbApiKey, getKolkataCpcbFeed, wantsFreshCpcbData } from '../../shared/cpcbFeed.mjs'

// Served at /api/cpcb via the redirect in netlify.toml.
export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const { status, body } = await getKolkataCpcbFeed(getCpcbApiKey(process.env), {
    fresh: wantsFreshCpcbData(event.queryStringParameters ?? {}),
  })
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  }
}
