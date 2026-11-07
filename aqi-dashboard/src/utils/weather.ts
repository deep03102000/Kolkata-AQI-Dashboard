import { resolveAppUrl } from './appUrl'

/**
 * Current weather at each station's coordinates from Open-Meteo (free, no key,
 * CORS-enabled, CC BY 4.0). These are model estimates for the location, updated
 * every 15 minutes, not readings from the station's own sensors: CPCB's feed on
 * data.gov.in has no weather fields.
 */
export type StationWeather = {
  temperature: number
  humidity: number
  feelsLike: number | null
  /** Local IST time of the estimate, e.g. "2026-11-07T13:45". */
  time: string
}

type StationGeo = { station_id: string; latitude: number; longitude: number }

type OpenMeteoCurrent = {
  current?: {
    time?: string
    temperature_2m?: number
    relative_humidity_2m?: number
    apparent_temperature?: number
  }
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const CACHE_TTL_MS = 10 * 60 * 1000

let request: { at: number; promise: Promise<Map<string, StationWeather>> } | null = null

async function fetchAllStationWeather() {
  const stationsResponse = await fetch(resolveAppUrl('/data/station_master.json'))
  if (!stationsResponse.ok) {
    throw new Error('Failed to load station list')
  }
  const stations = (await stationsResponse.json()) as StationGeo[]

  // One request for every station: Open-Meteo accepts comma-separated coordinates.
  const url = new URL(OPEN_METEO_URL)
  url.searchParams.set('latitude', stations.map((station) => station.latitude).join(','))
  url.searchParams.set('longitude', stations.map((station) => station.longitude).join(','))
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature')
  url.searchParams.set('timezone', 'Asia/Kolkata')

  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Open-Meteo responded with ${response.status}`)
  }

  const payload = (await response.json()) as OpenMeteoCurrent | OpenMeteoCurrent[]
  const results = Array.isArray(payload) ? payload : [payload]
  const byStation = new Map<string, StationWeather>()

  stations.forEach((station, index) => {
    const current = results[index]?.current
    if (
      current &&
      typeof current.temperature_2m === 'number' &&
      typeof current.relative_humidity_2m === 'number' &&
      typeof current.time === 'string'
    ) {
      byStation.set(station.station_id, {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        feelsLike: typeof current.apparent_temperature === 'number' ? current.apparent_temperature : null,
        time: current.time,
      })
    }
  })

  return byStation
}

/** Weather for all stations, shared by every component and refreshed at most every 10 minutes. */
export function loadAllStationWeather() {
  if (request && Date.now() - request.at < CACHE_TTL_MS) {
    return request.promise
  }

  const promise = fetchAllStationWeather()
  request = { at: Date.now(), promise }
  promise.catch(() => {
    if (request?.promise === promise) {
      request = null
    }
  })
  return promise
}

const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

/** "1:45 pm" from Open-Meteo's local "2026-11-07T13:45" (already IST). */
export function formatWeatherTime(time: string) {
  const parsed = new Date(`${time}:00+05:30`)
  return Number.isNaN(parsed.getTime()) ? time : timeFormatter.format(parsed)
}

export function formatTemperature(value: number) {
  return `${Math.round(value)}°C`
}
