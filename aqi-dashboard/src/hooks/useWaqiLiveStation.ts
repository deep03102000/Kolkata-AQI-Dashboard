import { useMemo } from 'react'
import { prefetchLiveAqiStations, useLiveAqi } from './useLiveAqi'
import type { WaqiLiveStationData } from '../utils/waqi'

type StationRef = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
}

type WaqiStatus = 'idle' | 'loading' | 'ready' | 'error'

export function prefetchWaqiLiveStations(stations: StationRef[]) {
  return prefetchLiveAqiStations(stations.map((station) => station.station_id))
}

export function useWaqiLiveStation(station: StationRef | null, enabled = true) {
  const { data: liveAqi, loading, error, stale } = useLiveAqi(station?.station_id ?? null, enabled)

  const data = useMemo<WaqiLiveStationData | null>(() => {
    if (!liveAqi || liveAqi.aqi === null || !liveAqi.raw) {
      return null
    }

    return {
      aqi: liveAqi.aqi,
      idx: liveAqi.stationUid,
      cityName: liveAqi.cityName ?? liveAqi.stationName,
      cityUrl: liveAqi.cityUrl,
      dominantPollutant: liveAqi.dominantPollutant,
      updatedAt: liveAqi.updatedAt,
      pollutants: liveAqi.pollutants,
      raw: liveAqi.raw,
    }
  }, [liveAqi])

  const status = useMemo<WaqiStatus>(() => {
    if (!enabled || !station) {
      return 'idle'
    }

    if (loading) {
      return 'loading'
    }

    if (!data && error) {
      return 'error'
    }

    if (data) {
      return 'ready'
    }

    return 'idle'
  }, [data, enabled, error, loading, station])

  return useMemo(
    () => ({
      data,
      status,
      stale,
    }),
    [data, status, stale],
  )
}
