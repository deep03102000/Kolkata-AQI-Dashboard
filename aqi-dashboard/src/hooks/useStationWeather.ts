import { useEffect, useState } from 'react'
import { loadAllStationWeather, type StationWeather } from '../utils/weather'

const REFRESH_MS = 10 * 60 * 1000

/** Current temperature and humidity at a station's location; refreshes every 10 minutes. */
export function useStationWeather(stationId: string | null, enabled = true) {
  const [weather, setWeather] = useState<StationWeather | null>(null)

  useEffect(() => {
    if (!enabled || !stationId) {
      setWeather(null)
      return
    }

    let cancelled = false
    const load = () => {
      loadAllStationWeather()
        .then((byStation) => {
          if (!cancelled) {
            setWeather(byStation.get(stationId) ?? null)
          }
        })
        .catch(() => {
          // Weather is extra context; keep the last value and try again on the next tick.
        })
    }

    load()
    const interval = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [enabled, stationId])

  return weather
}
