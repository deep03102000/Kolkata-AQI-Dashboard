import { useMemo } from 'react'
import {
  type WaqiLiveStationData,
  type WaqiPollutantKey,
  type WaqiResolvedPollutants,
  formatWaqiTimestamp,
  getLiveWaqiSummary,
} from '../utils/waqi'
import { useStationHistory } from '../hooks/useStationHistory'
import { getLatestHistoricalPollutants } from '../hooks/useLiveAqi'
import { LivePollutantGrid } from './LivePollutantGrid'
import { AnimatedNumber } from './AnimatedNumber'
import { getNextCpcbReadingLabel } from '../utils/cpcb'
import { useStationWeather } from '../hooks/useStationWeather'
import { formatTemperature, formatWeatherTime } from '../utils/weather'

// CPCB bands on a 0–500 track: 0–50, 51–100, 101–200, 201–300, 301–400, 401+.
const AQI_SCALE_GRADIENT =
  'linear-gradient(to right, #10b981 0% 9%, #84cc16 11% 19%, #f59e0b 21% 39%, #f97316 41% 59%, #f43f5e 61% 79%, #dc2626 81% 100%)'

type Props = {
  stationId: string
  liveData: WaqiLiveStationData
  stale: boolean
}

function ThermometerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M14 14.76V4a2 2 0 1 0-4 0v10.76a4 4 0 1 0 4 0Z" />
    </svg>
  )
}

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
    </svg>
  )
}

/** Temperature and humidity at the station's location (Open-Meteo estimate). */
function WeatherRow({ stationId }: { stationId: string }) {
  const weather = useStationWeather(stationId)

  if (!weather) {
    return <div className="skeleton h-11 rounded-lg" aria-label="Loading weather" />
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-5 text-sm text-slate-700">
        <span className="flex items-center gap-1.5" title="Air temperature">
          <span className="text-orange-500">
            <ThermometerIcon />
          </span>
          <span className="font-semibold tabular-nums text-slate-900">{formatTemperature(weather.temperature)}</span>
          {weather.feelsLike !== null ? (
            <span className="text-xs text-slate-500">feels {formatTemperature(weather.feelsLike)}</span>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5" title="Relative humidity">
          <span className="text-sky-500">
            <DropIcon />
          </span>
          <span className="font-semibold tabular-nums text-slate-900">{Math.round(weather.humidity)}%</span>
          <span className="text-xs text-slate-500">humidity</span>
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        Weather estimate for this location · Open-Meteo · {formatWeatherTime(weather.time)}
      </p>
    </div>
  )
}

/**
 * Pollutants the live source didn't report (e.g. a nearby sensor with PM2.5 only)
 * are filled with the station's latest recorded value, marked "last known".
 * The history file is the one the selected station's chart already loads.
 */
function usePollutantsWithFallback(stationId: string, pollutants: WaqiResolvedPollutants) {
  const hasGaps = Object.values(pollutants).some((pollutant) => pollutant.value === null)
  const { data: history } = useStationHistory(hasGaps ? stationId : null)

  return useMemo(() => {
    if (!hasGaps || !history) {
      return pollutants
    }
    const latest = getLatestHistoricalPollutants(history.records)
    const filled = { ...pollutants }
    for (const key of Object.keys(filled) as WaqiPollutantKey[]) {
      const value = latest[key]
      if (filled[key].value === null && value !== undefined && value !== null) {
        filled[key] = { value, source: 'last known' }
      }
    }
    return filled
  }, [hasGaps, history, pollutants])
}

export function LiveStationCard({ stationId, liveData, stale }: Props) {
  const summary = getLiveWaqiSummary(liveData)
  const pollutants = usePollutantsWithFallback(stationId, liveData.pollutants)
  const updatedAt = formatWaqiTimestamp(liveData.updatedAt)
  const sensor = liveData.nearbySensor ?? null
  const nextReading = liveData.cpcbStation ? getNextCpcbReadingLabel(liveData.updatedAt) : null

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <div className="flex items-end gap-3">
          <AnimatedNumber value={summary.value} className="text-5xl font-semibold leading-none tracking-tight text-slate-950" />
          <span className="mb-1 text-sm font-medium transition-colors duration-500" style={{ color: summary.category.color }}>
            {summary.category.label}
          </span>
        </div>

        {/* Thin AQI scale: the marker sits at the reading's position on 0–500. */}
        <div className="relative mt-3 h-1.5 rounded-full" style={{ backgroundImage: AQI_SCALE_GRADIENT }}>
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow transition-[left] duration-700 ease-out"
            style={{ left: `${Math.min(100, (summary.value / 500) * 100)}%`, backgroundColor: summary.category.color }}
          />
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          {updatedAt ? <>Updated {updatedAt}</> : null}
          {stale ? <span className="ml-1.5 font-medium text-amber-700">· Stale</span> : null}
        </p>
        {liveData.cpcbStation ? (
          <p className="flex items-center gap-1.5 text-xs leading-5 text-slate-500" title={liveData.cpcbStation}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Official CPCB station{nextReading ? <> · {nextReading.replace('CPCB publishes hourly. ', '')}</> : null}
          </p>
        ) : sensor ? (
          <p className="mt-1 text-xs leading-5 text-amber-700">
            Station feed offline. Showing the nearest sensor, {sensor.name} ({sensor.distanceKm.toFixed(1)} km).
          </p>
        ) : null}
      </div>

      <WeatherRow stationId={stationId} />

      <LivePollutantGrid pollutants={pollutants} />
    </div>
  )
}
