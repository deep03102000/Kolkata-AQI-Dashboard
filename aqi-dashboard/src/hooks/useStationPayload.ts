import { useEffect, useState } from 'react'
import type { PollutantRecord } from '../utils/aqi'

type StationGeo = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
}

type StationPayload = StationGeo & {
  records: PollutantRecord[]
}

const stationPayloadCache = new Map<string, Promise<StationPayload>>()

export function useStationPayload(stationId: string, enabled = true) {
  const [data, setData] = useState<StationPayload | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(enabled ? 'loading' : 'idle')

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    setStatus('loading')

    const request =
      stationPayloadCache.get(stationId) ??
      (() => {
        const promise = fetch(`/data/station_${stationId}.json`).then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load data for ${stationId}`)
          }

          return response.json() as Promise<StationPayload>
        })

        stationPayloadCache.set(stationId, promise)
        return promise
      })()

    request
      .then((payload) => {
        if (!cancelled) {
          setData(payload)
          setStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [enabled, stationId])

  return { data, status }
}