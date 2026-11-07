import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const envPath = path.join(rootDir, '.env.local')
const outputPath = path.join(rootDir, 'public', 'data', 'waqi_last_updated_stations.json')

const stations = [
  { station_id: 'site_5238', station_name: 'Ballygunge', latitude: 22.5191616, longitude: 88.3721923, uid: 12746 },
  { station_id: 'site_5129', station_name: 'Bidhannagar', latitude: 22.59123, longitude: 88.390737, uid: 12745 },
  { station_id: 'site_5110', station_name: 'Fort William', latitude: 22.5577, longitude: 88.338, uid: 12457 },
  { station_id: 'site_5111', station_name: 'Jadavpur', latitude: 22.502513, longitude: 88.3676051, uid: 12458 },
  { station_id: 'site_5126', station_name: 'Rabindra Sarobar', latitude: 22.5057, longitude: 88.34521, uid: 12467 },
  { station_id: 'site_296', station_name: 'Rabindra Bharati University', latitude: 22.5844542, longitude: 88.3593841, uid: 9145 },
]

function parseEnvFile(text) {
  const result = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const equalsIndex = line.indexOf('=')
    if (equalsIndex < 0) {
      continue
    }

    const key = line.slice(0, equalsIndex).trim()
    const value = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) {
      result[key] = value
    }
  }
  return result
}

async function loadToken() {
  const env = {
    ...parseEnvFile(await fs.readFile(envPath, 'utf8').catch(() => '')),
    ...process.env,
  }

  const token = (env.WAQI_API_TOKEN || env.VITE_WAQI_API_TOKEN || '').trim()
  if (!token) {
    throw new Error('Missing WAQI_API_TOKEN or VITE_WAQI_API_TOKEN')
  }

  return token
}

function buildCategory(aqi) {
  const value = Number(aqi)
  if (!Number.isFinite(value)) {
    return null
  }

  if (value <= 50) return { label: 'Good', color: '#22c55e' }
  if (value <= 100) return { label: 'Moderate', color: '#eab308' }
  if (value <= 150) return { label: 'Unhealthy for Sensitive Groups', color: '#f97316' }
  if (value <= 200) return { label: 'Unhealthy', color: '#ef4444' }
  if (value <= 300) return { label: 'Very Unhealthy', color: '#a855f7' }
  return { label: 'Hazardous', color: '#7f1d1d' }
}

function normalizeResponse(payload) {
  const data = payload?.status === 'ok' ? payload.data : null
  if (!data) {
    return null
  }

  return {
    aqi: data.aqi ?? null,
    idx: data.idx ?? null,
    cityName: data.city?.name ?? null,
    cityUrl: data.city?.url ?? null,
    dominantPollutant: data.dominentpol ?? null,
    updatedAt: data.time?.s ?? null,
    aqiTimestampIso: data.time?.iso ?? null,
    sourceDebugSync: data.debug?.sync ?? null,
    attributions: Array.isArray(data.attributions)
      ? data.attributions.map((entry) => ({
          name: entry?.name ?? null,
          url: entry?.url ?? null,
        }))
      : [],
    pollutants: {
      pm25: data.iaqi?.pm25?.v ?? null,
      pm10: data.iaqi?.pm10?.v ?? null,
      no2: data.iaqi?.no2?.v ?? null,
      so2: data.iaqi?.so2?.v ?? null,
      co: data.iaqi?.co?.v ?? null,
      o3: data.iaqi?.o3?.v ?? null,
      nh3: data.iaqi?.nh3?.v ?? null,
    },
    forecast: data.forecast?.daily ?? null,
    raw: data,
  }
}

async function fetchWaqi(uid, token) {
  const url = `https://api.waqi.info/feed/@${uid}/?token=${token}`
  const response = await fetch(url, { cache: 'no-store' })
  const bodyText = await response.text()
  let payload = null
  try {
    payload = JSON.parse(bodyText)
  } catch {
    payload = { status: 'error', data: bodyText }
  }

  return {
    httpStatus: response.status,
    payload,
    normalized: normalizeResponse(payload),
  }
}

async function loadExistingSnapshot() {
  const text = await fs.readFile(outputPath, 'utf8').catch(() => '')
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function main() {
  const token = await loadToken()
  const previous = await loadExistingSnapshot()
  const previousStations = new Map(
    Array.isArray(previous?.stations)
      ? previous.stations.map((station) => [station.station_id, station])
      : [],
  )

  const stationsOut = []

  for (const station of stations) {
    try {
      const result = await fetchWaqi(station.uid, token)
      const normalized = result.normalized
      if (normalized) {
        stationsOut.push({
          station_id: station.station_id,
          station_name: station.station_name,
          uid: station.uid,
          latitude: station.latitude,
          longitude: station.longitude,
          source: 'WAQI',
          tokenUsed: 'VITE_WAQI_API_TOKEN',
          generatedAt: new Date().toISOString(),
          current: {
            aqi: Number(normalized.aqi),
            category: buildCategory(normalized.aqi),
            updatedAt: normalized.updatedAt,
            aqiTimestampIso: normalized.aqiTimestampIso,
            cityName: normalized.cityName,
            cityUrl: normalized.cityUrl,
            dominantPollutant: normalized.dominantPollutant,
            pollutants: normalized.pollutants,
            attributions: normalized.attributions,
          },
          waqi: normalized,
          rawResponse: result.payload,
        })
        continue
      }
    } catch (error) {
      console.warn(`WAQI refresh failed for ${station.station_id}:`, error instanceof Error ? error.message : error)
    }

    const fallback = previousStations.get(station.station_id) ?? null
    if (fallback) {
      stationsOut.push(fallback)
      continue
    }

    stationsOut.push({
      station_id: station.station_id,
      station_name: station.station_name,
      uid: station.uid,
      latitude: station.latitude,
      longitude: station.longitude,
      source: 'WAQI',
      tokenUsed: 'VITE_WAQI_API_TOKEN',
      generatedAt: new Date().toISOString(),
      current: null,
      waqi: null,
      rawResponse: null,
    })
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'WAQI API',
    note: 'Auto-refreshed on app start. Uses the latest WAQI response available for the six Kolkata stations.',
    stations: stationsOut,
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(`Refreshed WAQI snapshot: ${path.relative(rootDir, outputPath)}`)
}

main().catch((error) => {
  console.warn('WAQI snapshot refresh skipped:', error instanceof Error ? error.message : error)
  process.exitCode = 0
})
