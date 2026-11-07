import { type WaqiLiveStationData, formatWaqiTimestamp, getLiveWaqiSummary } from '../utils/waqi'
import { LivePollutantGrid } from './LivePollutantGrid'
import { getNextCpcbReadingLabel } from '../utils/cpcb'

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
    <div className="min-w-0 space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Live AQI</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-4xl font-semibold tracking-tight text-slate-950 tabular-nums">{summary.value}</p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${summary.category.className}`}>
            {summary.category.label}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {updatedAt ? <>Updated {updatedAt}</> : null}
          {stale ? <span className="ml-1.5 font-semibold text-amber-700">· Stale</span> : null}
        </p>
        {liveData.cpcbStation ? (
          <p className="mt-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs leading-5 text-emerald-800 ring-1 ring-emerald-200">
            Official reading from the CPCB station <strong>{liveData.cpcbStation}</strong>.
            {nextReading ? <span className="mt-0.5 block text-emerald-700">{nextReading}</span> : null}
          </p>
        ) : sensor ? (
          <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs leading-5 text-amber-800 ring-1 ring-amber-200">
            The station's own feed is offline. Showing the nearest live sensor, <strong>{sensor.name}</strong>,{' '}
            {sensor.distanceKm.toFixed(1)} km away.
          </p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Pollutants</p>
        <LivePollutantGrid pollutants={liveData.pollutants} />
      </div>
    </div>
  )
}
