import { getAqiCategory, type AqiSummary } from './aqi'

const WAQI_API_BASE_URL = 'https://api.waqi.info'

export type WaqiPollutantKey = 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3' | 'nh3'
export type WaqiPollutantSource = 'live' | 'last known'

export type WaqiFeedResponse = {
  status: 'ok' | 'error'
  data?: {
    aqi?: number | string
    idx?: number
    iaqi?: Partial<
      Record<
        WaqiPollutantKey,
        {
          v?: number | string | null
        }
      >
    >
    city?: {
      name?: string
      url?: string
      geo?: [number, number]
    }
    dominentpol?: string
    time?: {
      s?: string
      tz?: string
      v?: number
    }
    attributions?: Array<{
      name?: string
      url?: string
    }>
  }
  dataMessage?: string
}

export type WaqiResolvedPollutant = {
  value: number | null
  source: WaqiPollutantSource | null
}

export type WaqiResolvedPollutants = Record<WaqiPollutantKey, WaqiResolvedPollutant>

export type WaqiLiveStationData = {
  aqi: number
  idx: number | null
  cityName: string | null
  cityUrl: string | null
  dominantPollutant: string | null
  updatedAt: string | null
  pollutants: WaqiResolvedPollutants
  raw: NonNullable<WaqiFeedResponse['data']>
}

export type WaqiNormalizedPollutants = Record<WaqiPollutantKey, number | null>

export type LiveAqiData = {
  stationId: string
  stationName: string | null
  stationUid: number | null
  aqi: number | null
  pollutants: WaqiResolvedPollutants
  dominantPollutant: string | null
  updatedAt: string | null
  cityName: string | null
  cityUrl: string | null
  raw: NonNullable<WaqiFeedResponse['data']> | null
}

export function getWaqiToken() {
  return import.meta.env.VITE_WAQI_API_TOKEN?.trim() ?? ''
}

export function getWaqiProxyUrl() {
  const configuredProxy = import.meta.env.VITE_WAQI_PROXY_URL?.trim() ?? ''
  if (configuredProxy) {
    return configuredProxy
  }

  return import.meta.env.DEV ? '/.netlify/functions/waqi' : ''
}

export function hasWaqiToken() {
  return getWaqiToken().length > 0
}

export function hasWaqiProxy() {
  return getWaqiProxyUrl().length > 0
}

export function hasWaqiLiveAccess() {
  return hasWaqiProxy() || hasWaqiToken()
}

export function getWaqiAccessLabel() {
  if (hasWaqiProxy()) {
    return 'proxy configured'
  }

  if (hasWaqiToken()) {
    return 'token configured'
  }

  return 'token missing'
}

function buildWaqiRequestUrl(path: string) {
  const proxyUrl = getWaqiProxyUrl()

  if (proxyUrl) {
    const url = new URL(proxyUrl, window.location.origin)
    url.searchParams.set('path', path)
    return url.toString()
  }

  const url = new URL(path, WAQI_API_BASE_URL)
  const token = getWaqiToken()

  if (token) {
    url.searchParams.set('token', token)
  }

  return url.toString()
}

export function buildWaqiGeoFeedUrl(latitude: number, longitude: number) {
  return buildWaqiRequestUrl(`feed/geo:${latitude};${longitude}/`)
}

export function buildWaqiUidFeedUrl(uid: number) {
  return buildWaqiRequestUrl(`feed/@${uid}/`)
}

export function formatWaqiTimestamp(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(parsed)
}

export function isWaqiTimestampStale(value: string | null, maxAgeMs = 24 * 60 * 60 * 1000) {
  if (!value) {
    return true
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return true
  }

  return Date.now() - parsed.getTime() > maxAgeMs
}

function normalizeWaqiValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  const numericValue = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(numericValue) ? numericValue : null
}

export function normalizeWaqiPollutants(payload: NonNullable<WaqiFeedResponse['data']>): WaqiNormalizedPollutants {
  return {
    pm25: normalizeWaqiValue(payload.iaqi?.pm25?.v),
    pm10: normalizeWaqiValue(payload.iaqi?.pm10?.v),
    no2: normalizeWaqiValue(payload.iaqi?.no2?.v),
    so2: normalizeWaqiValue(payload.iaqi?.so2?.v),
    co: normalizeWaqiValue(payload.iaqi?.co?.v),
    o3: normalizeWaqiValue(payload.iaqi?.o3?.v),
    nh3: normalizeWaqiValue(payload.iaqi?.nh3?.v),
  }
}

export function buildResolvedWaqiPollutants(
  live: WaqiNormalizedPollutants,
  fallback: Partial<WaqiNormalizedPollutants>,
): WaqiResolvedPollutants {
  return {
    pm25:
      live.pm25 !== null
        ? { value: live.pm25, source: 'live' }
        : { value: fallback.pm25 ?? null, source: fallback.pm25 !== undefined ? 'last known' : null },
    pm10:
      live.pm10 !== null
        ? { value: live.pm10, source: 'live' }
        : { value: fallback.pm10 ?? null, source: fallback.pm10 !== undefined ? 'last known' : null },
    no2:
      live.no2 !== null
        ? { value: live.no2, source: 'live' }
        : { value: fallback.no2 ?? null, source: fallback.no2 !== undefined ? 'last known' : null },
    so2:
      live.so2 !== null
        ? { value: live.so2, source: 'live' }
        : { value: fallback.so2 ?? null, source: fallback.so2 !== undefined ? 'last known' : null },
    co:
      live.co !== null
        ? { value: live.co, source: 'live' }
        : { value: fallback.co ?? null, source: fallback.co !== undefined ? 'last known' : null },
    o3:
      live.o3 !== null
        ? { value: live.o3, source: 'live' }
        : { value: fallback.o3 ?? null, source: fallback.o3 !== undefined ? 'last known' : null },
    nh3:
      live.nh3 !== null
        ? { value: live.nh3, source: 'live' }
        : { value: fallback.nh3 ?? null, source: fallback.nh3 !== undefined ? 'last known' : null },
  }
}

export function getLiveWaqiSummary(data: WaqiLiveStationData): AqiSummary {
  const category = getAqiCategory(data.aqi)

  return {
    value: Math.round(data.aqi),
    category,
    sourceLabel: 'Live AQI',
    detailLabel: [
      data.cityName ?? (data.idx !== null ? `WAQI node #${data.idx}` : 'WAQI node'),
      data.updatedAt ? `Updated ${data.updatedAt}` : null,
      data.dominantPollutant ? `Dominant pollutant ${data.dominantPollutant.toUpperCase()}` : null,
    ]
      .filter((entry): entry is string => Boolean(entry))
      .join(' | '),
  }
}
