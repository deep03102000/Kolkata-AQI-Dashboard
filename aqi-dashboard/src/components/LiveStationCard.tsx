import { type WaqiLiveStationData, formatWaqiTimestamp, getLiveWaqiSummary } from '../utils/waqi'
import { LivePollutantGrid } from './LivePollutantGrid'
import { AnimatedNumber } from './AnimatedNumber'
import { getNextCpcbReadingLabel } from '../utils/cpcb'

// CPCB bands on a 0–500 track: 0–50, 51–100, 101–200, 201–300, 301–400, 401+.
const AQI_SCALE_GRADIENT =
  'linear-gradient(to right, #10b981 0% 9%, #84cc16 11% 19%, #f59e0b 21% 39%, #f97316 41% 59%, #f43f5e 61% 79%, #dc2626 81% 100%)'

type Props = {
  liveData: WaqiLiveStationData
  stale: boolean
}

export function LiveStationCard({ liveData, stale }: Props) {
  const summary = getLiveWaqiSummary(liveData)
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

      <LivePollutantGrid pollutants={liveData.pollutants} />
    </div>
  )
}
