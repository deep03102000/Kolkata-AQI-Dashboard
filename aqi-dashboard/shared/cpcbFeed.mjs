// Server-side reader for CPCB's real-time station feed, published on data.gov.in
// ("Real time Air Quality Index from various locations"). Shared by the Vite dev
// server, the Render server (server.mjs) and the Netlify function so the API key
// never reaches the browser.
//
// Each upstream record is one pollutant at one station (verified 2026-11-07):
//   { station: "Ballygunge, Kolkata - WBPCB", last_update: "DD-MM-YYYY HH:MM:SS" (IST),
//     latitude, longitude, pollutant_id: PM2.5|PM10|NO2|SO2|CO|OZONE|NH3,
//     min_value, max_value, avg_value }
// The values are CPCB AQI sub-indices (e.g. CO reads ~30–75, impossible as mg/m³),
// so a station's AQI is its highest sub-index.
// This module groups them into one entry per station.

const RESOURCE_URL = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69'
const CITY = 'Kolkata'
// Cache lifetimes. CPCB publishes each hour's reading roughly 25–40 min after the
// hour, so once the next reading is due we re-check every minute; otherwise every 5.
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_TTL_WHEN_DUE_MS = 60 * 1000
const NEXT_READING_DUE_AFTER_MS = (60 + 25) * 60 * 1000
// A page reload asks for fresh data; never hit data.gov.in more often than this.
const MIN_FRESH_INTERVAL_MS = 30 * 1000
const REQUEST_TIMEOUT_MS = 20_000

const POLLUTANT_KEYS = {
  'PM2.5': 'pm25',
  PM10: 'pm10',
  NO2: 'no2',
  SO2: 'so2',
  CO: 'co',
  OZONE: 'o3',
  O3: 'o3',
  NH3: 'nh3',
}

let cache = null

export function getCpcbApiKey(env) {
  return String(env.DATA_GOV_IN_API_KEY ?? '').trim()
}

function toNumber(value) {
  if (value === null || value === undefined || value === '' || value === 'NA') {
    return null
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/** "07-11-2026 11:00:00" (IST) -> "2026-11-07T11:00:00+05:30" */
function toIsoTimestamp(value) {
  const match = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value ?? '').trim())
  if (!match) {
    return null
  }
  const [, day, month, year, hour, minute, second = '00'] = match
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`
}

export function normalizeCpcbRecords(records) {
  const stations = new Map()

  for (const record of records) {
    const name = String(record.station ?? '').trim()
    const key = POLLUTANT_KEYS[String(record.pollutant_id ?? '').trim().toUpperCase()]
    if (!name || !key) {
      continue
    }

    const entry = stations.get(name) ?? { station: name, lastUpdate: null, pollutants: {} }
    const lastUpdate = toIsoTimestamp(record.last_update)
    if (lastUpdate && (!entry.lastUpdate || lastUpdate > entry.lastUpdate)) {
      entry.lastUpdate = lastUpdate
    }
    // The live API names these min_value/max_value/avg_value; older docs and
    // examples call them pollutant_min/max/avg. Accept both.
    entry.pollutants[key] = {
      min: toNumber(record.min_value ?? record.pollutant_min),
      max: toNumber(record.max_value ?? record.pollutant_max),
      avg: toNumber(record.avg_value ?? record.pollutant_avg),
    }
    stations.set(name, entry)
  }

  return [...stations.values()]
}

async function fetchFromDataGovIn(apiKey) {
  const url = new URL(RESOURCE_URL)
  url.searchParams.set('api-key', apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1000')
  url.searchParams.set('filters[city]', CITY)

  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`data.gov.in responded with ${response.status}`)
  }

  const payload = await response.json()
  if (!Array.isArray(payload?.records)) {
    throw new Error(payload?.message || 'data.gov.in returned no records')
  }

  return {
    source: 'CPCB real-time feed (data.gov.in)',
    fetchedAt: new Date().toISOString(),
    stations: normalizeCpcbRecords(payload.records),
  }
}

function isNextReadingDue(body) {
  const newest = body.stations
    .map((station) => (station.lastUpdate ? new Date(station.lastUpdate).getTime() : 0))
    .reduce((max, value) => Math.max(max, value), 0)
  return newest === 0 || Date.now() >= newest + NEXT_READING_DUE_AFTER_MS
}

function isCacheUsable(fresh) {
  if (!cache) {
    return false
  }
  const age = Date.now() - cache.at
  const due = isNextReadingDue(cache.body)

  if (fresh) {
    // A reload wants the newest data. If the next hourly reading can't exist yet,
    // the cached copy already is the newest, so answer instantly (data.gov.in takes 2-3 s).
    return !due ? age < CACHE_TTL_MS : age < MIN_FRESH_INTERVAL_MS
  }
  return age < (due ? CACHE_TTL_WHEN_DUE_MS : CACHE_TTL_MS)
}

/** True when the request asks to skip the cache (the browser sends ?fresh=1 on page load). */
export function wantsFreshCpcbData(searchParams) {
  return searchParams?.get?.('fresh') === '1' || searchParams?.fresh === '1'
}

/**
 * Returns `{ status, body }` for an HTTP handler to send.
 * 503 `not_configured` when no key is set, so clients can quietly skip this source.
 * `fresh` skips the cache (still at most one upstream call per 30 s).
 */
export async function getKolkataCpcbFeed(apiKey, { fresh = false } = {}) {
  if (!apiKey) {
    return { status: 503, body: { error: 'not_configured', message: 'DATA_GOV_IN_API_KEY is not set' } }
  }

  if (isCacheUsable(fresh)) {
    return { status: 200, body: cache.body }
  }

  try {
    const body = await fetchFromDataGovIn(apiKey)
    cache = { at: Date.now(), body }
    return { status: 200, body }
  } catch (error) {
    // Serve the last good copy rather than nothing; clients judge freshness by lastUpdate.
    if (cache) {
      return { status: 200, body: cache.body }
    }
    return {
      status: 502,
      body: { error: 'upstream_failed', message: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}
