// Vercel Function for the CPCB live feed, pinned to Mumbai (bom1) in vercel.json.
//
// data.gov.in refuses connections from servers outside India (ECONNREFUSED from
// Netlify's US functions), so the deployed site's /api/cpcb is proxied here by
// netlify.toml. Same shared code as the dev server, Render and Netlify routes.
import { getCpcbApiKey, getKolkataCpcbFeed } from '../aqi-dashboard/shared/cpcbFeed.mjs'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { status, body } = await getKolkataCpcbFeed(getCpcbApiKey(process.env), {
    fresh: req.query?.fresh === '1',
  })
  res.setHeader('cache-control', 'no-store')
  res.status(status).json(body)
}
