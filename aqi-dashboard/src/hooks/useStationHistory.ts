import { useEffect, useState } from 'react'
import type { PollutantRecord } from '../utils/aqi'

export type StationHistory = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
  records: PollutantRecord[]
}

export type StationHistoryStatus = 'idle' | 'loading' | 'ready' | 'error'

const stationHistoryCache = new Map<string, Promise<StationHistory>>()

function loadStationHistory(stationId: string) {
  const cached = stationHistoryCache.get(stationId)

  if (cached) {
    return cached
  }

  const request = fetch(`/data/station_${stationId}.json`).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to load history for station ${stationId}`)
    }

    return response.json() as Promise<StationHistory>
  })

  stationHistoryCache.set(stationId, request)
  return request
}

export function useStationHistory(stationId: string | null | undefined) {
  const [data, setData] = useState<StationHistory | null>(null)
  const [status, setStatus] = useState<StationHistoryStatus>(stationId ? 'loading' : 'idle')
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!stationId) {
      setData(null)
      setStatus('idle')
      setError(null)
      return
    }

    let cancelled = false

    setStatus('loading')
    setError(null)

    loadStationHistory(stationId)
      .then((payload) => {
        if (!cancelled) {
          setData(payload)
          setStatus('ready')
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setData(null)
          setStatus('error')
          setError(loadError instanceof Error ? loadError : new Error('Failed to load station history'))
        }
      })

    return () => {
      cancelled = true
    }
  }, [stationId])

  return { data, status, error }
}
