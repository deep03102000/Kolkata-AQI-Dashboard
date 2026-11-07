import { useEffect } from 'react'
import { prefetchWaqiLiveStations } from './useWaqiLiveStation'
import { resolveAppUrl } from '../utils/appUrl'

type StationGeo = {
  station_id: string
  station_name: string
  latitude: number
  longitude: number
}

export function usePrefetchWaqiLiveStations() {
  useEffect(() => {
    let cancelled = false

    fetch(resolveAppUrl('/data/station_master.json'))
      .then((response) => response.json() as Promise<StationGeo[]>)
      .then((stations) => {
        if (!cancelled) {
          void prefetchWaqiLiveStations(stations)
        }
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])
}

