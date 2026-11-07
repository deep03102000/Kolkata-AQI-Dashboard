import { calculateRecordAqi } from './aqi'
import { resolveAppUrl } from './appUrl'
import type { WaqiNormalizedPollutants, WaqiPollutantKey } from './waqi'

/** One official CPCB station as served by /api/cpcb (see shared/cpcbFeed.mjs). */
export type CpcbStationReading = {
  station: string
  lastUpdate: string | null
  pollutants: Partial<Record<WaqiPollutantKey, { min: number | null; max: number | null; avg: number | null }>>
}

type CpcbFeed = {
  source: string
  fetchedAt: string
  stations: CpcbStationReading[]
}

/**
 * How to read `pollutant_avg` from the data.gov.in feed.
 * 'subindex': values are already CPCB AQI sub-indices, so AQI = the highest one.
 * 'concentration': values are µg/m³ (mg/m³ for CO) and are converted with CPCB breakpoints.
 * Verified against the live feed on 2026-11-07: values are sub-indices (CO reads ~30–75,
 * which is impossible as mg/m³; NH₃ ~6–15 matches its sub-index scale).
 */
export const CPCB_VALUE_KIND: 'subindex' | 'concentration' = 'subindex'

const FEED_URL = '/api/cpcb'
// The server decides how often data.gov.in is actually called (see shared/cpcbFeed.mjs);
// the browser just re-asks the server once a minute.
const FEED_CACHE_TTL_MS = 60 * 1000

let feedRequest: { at: number; promise: Promise<CpcbFeed | null> } | null = null
// Module state resets on every page load, so the first request after a reload or
// refresh asks the server to skip its cache and fetch the newest CPCB data.
let isFirstRequestThisPage = true
// Set when the server has no API key, so we stop asking for the rest of the session.
let notConfigured = false

export async function loadCpcbFeed(): Promise<CpcbFeed | null> {
  if (notConfigured) {
    return null
  }

  if (feedRequest && Date.now() - feedRequest.at < FEED_CACHE_TTL_MS) {
    return feedRequest.promise
  }

  const fresh = isFirstRequestThisPage
  isFirstRequestThisPage = false

  const promise = (async () => {
    const response = await fetch(resolveAppUrl(fresh ? `${FEED_URL}?fresh=1` : FEED_URL), { cache: 'no-store' })
    if (response.status === 503) {
      notConfigured = true
      return null
    }
    if (!response.ok) {
      throw new Error(`CPCB feed request failed with ${response.status}`)
    }
    return (await response.json()) as CpcbFeed
  })()

  feedRequest = { at: Date.now(), promise }
  promise.catch(() => {
    if (feedRequest?.promise === promise) {
      feedRequest = null
    }
  })
  return promise
}

/** CPCB names stations like "Ballygunge, Kolkata - WBPCB". */
export function findCpcbStation(feed: CpcbFeed, stationName: string) {
  const wanted = stationName.trim().toLowerCase()
  return (
    feed.stations.find((entry) => {
      const name = entry.station.trim().toLowerCase()
      return name === wanted || name.startsWith(`${wanted},`) || name.startsWith(`${wanted} -`)
    }) ?? null
  )
}

export function getCpcbPollutantValues(reading: CpcbStationReading): WaqiNormalizedPollutants {
  const value = (key: WaqiPollutantKey) => reading.pollutants[key]?.avg ?? null
  return {
    pm25: value('pm25'),
    pm10: value('pm10'),
    no2: value('no2'),
    so2: value('so2'),
    co: value('co'),
    o3: value('o3'),
    nh3: value('nh3'),
  }
}

export function computeCpcbAqi(values: WaqiNormalizedPollutants): number | null {
  if (CPCB_VALUE_KIND === 'subindex') {
    const subIndices = Object.values(values).filter((value): value is number => value !== null)
    return subIndices.length > 0 ? Math.round(Math.max(...subIndices)) : null
  }

  const aqi = calculateRecordAqi({
    date: '',
    pm25: values.pm25 ?? Number.NaN,
    pm10: values.pm10 ?? Number.NaN,
    no2: values.no2 ?? Number.NaN,
    so2: values.so2 ?? Number.NaN,
    co: values.co ?? Number.NaN,
    o3: values.o3 ?? Number.NaN,
  })
  return aqi === null ? null : Math.round(aqi)
}

// CPCB computes each hour's AQI after the hour ends; data.gov.in publishes it
// roughly 30–40 minutes later (observed 2026-11-07: 12:00 data appeared at 12:32 IST).
const PUBLISH_DELAY_MINUTES = 35

const istTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
})

/**
 * "Next CPCB reading expected around 1:35 pm" for a reading stamped `lastUpdate`.
 * The next hourly reading is lastUpdate + 1 h, published ~35 min after that.
 */
export function getNextCpcbReadingLabel(lastUpdate: string | null, now = new Date()) {
  const last = lastUpdate ? new Date(lastUpdate) : null
  if (!last || Number.isNaN(last.getTime())) {
    return null
  }

  const expected = new Date(last.getTime() + (60 + PUBLISH_DELAY_MINUTES) * 60 * 1000)
  if (now.getTime() < expected.getTime()) {
    return `CPCB publishes hourly. Next reading expected around ${istTimeFormatter.format(expected)}.`
  }

  return 'CPCB publishes hourly. The next reading is due any minute.'
}

/** Pollutant with the highest value, reported as the dominant one. */
export function getDominantCpcbPollutant(values: WaqiNormalizedPollutants) {
  let best: { key: WaqiPollutantKey; value: number } | null = null
  for (const [key, value] of Object.entries(values) as Array<[WaqiPollutantKey, number | null]>) {
    if (value !== null && (!best || value > best.value)) {
      best = { key, value }
    }
  }
  return best?.key ?? null
}
