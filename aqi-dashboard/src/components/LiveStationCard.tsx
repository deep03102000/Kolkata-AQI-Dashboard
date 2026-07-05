import { type WaqiLiveStationData, formatWaqiTimestamp, getLiveWaqiSummary } from '../utils/waqi'
import { LivePollutantGrid } from './LivePollutantGrid'

type Props = {
  stationName: string
  liveData: WaqiLiveStationData
  stale: boolean
}

export function LiveStationCard({ stationName, liveData, stale }: Props) {
  const summary = getLiveWaqiSummary(liveData)
  const updatedAt = formatWaqiTimestamp(liveData.updatedAt)

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Current live AQI</p>
          <h3 className="mt-1 break-words text-sm font-semibold text-slate-900">{stationName}</h3>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-1">
          {updatedAt ? (
            <span className="inline-flex max-w-full items-center rounded-full border border-emerald-200 bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm shadow-emerald-500/20">
              <span className="truncate">Last updated {updatedAt}</span>
            </span>
          ) : null}
          {stale ? (
            <span className="inline-flex max-w-full items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
              <span className="truncate">Stale live data</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{summary.sourceLabel}</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{summary.value}</p>
          </div>
          <span className={`max-w-full rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 ${summary.category.className}`}>
            <span className="truncate">{summary.category.label}</span>
          </span>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{summary.detailLabel}</p>
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live pollutants</p>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1"
            style={{
              backgroundColor: `${summary.category.color}14`,
              color: summary.category.color,
              borderColor: `${summary.category.color}33`,
            }}
          >
            WAQI feed
          </span>
        </div>
        <LivePollutantGrid
          pollutants={liveData.pollutants}
          accentColor={summary.category.color}
          accentLabelClassName={summary.category.className}
        />
      </div>
    </section>
  )
}
