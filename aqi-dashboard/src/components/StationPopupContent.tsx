import { useMemo } from 'react'
import { useStationContext } from '../context/StationContext'
import { formatWaqiTimestamp, getLiveWaqiSummary, type WaqiLiveStationData } from '../utils/waqi'
import type { AqiSummary } from '../utils/aqi'

type StationIdentity = {
  station_id: string
  station_name: string
}

type Props = {
  station: StationIdentity
  liveData: WaqiLiveStationData | null
  liveLoading: boolean
  liveError: boolean
  liveStale: boolean
  /** Set in Historical mode: shows the date-range average instead of live data (null while loading). */
  historicalSummary?: AqiSummary | null
}

type StationSummaryCardProps = {
  station: StationIdentity
  summary: ReturnType<typeof getLiveWaqiSummary>
  sourceLabel?: string
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />
}


export function StationSummaryCard({ station, summary, sourceLabel }: StationSummaryCardProps) {
  return (
    <div className="min-w-0 max-w-[210px] space-y-1.5 sm:max-w-[230px]">
      <div className="space-y-0.5">
        <p className="break-words text-sm font-semibold leading-5 text-slate-900">{station.station_name}</p>
        <p className="break-all text-[11px] text-slate-500">{station.station_id}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {sourceLabel ?? summary.sourceLabel}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${summary.category.className}`}
          >
            {summary.category.label}
          </span>
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight text-slate-950">{summary.value}</p>
          <span className="max-w-[105px] text-right text-[11px] leading-4 text-slate-500">{summary.detailLabel}</span>
        </div>
      </div>
    </div>
  )
}

export function StationPopupContent({
  station,
  liveData,
  liveLoading,
  liveError,
  liveStale,
  historicalSummary,
}: Props) {
  const { selectedStationId } = useStationContext()

  const summary = useMemo(() => {
    return liveData ? getLiveWaqiSummary(liveData) : null
  }, [liveData])

  const isSelected = selectedStationId === station.station_id
  const liveUpdatedAt = liveData?.updatedAt ?? null
  const isHistorical = historicalSummary !== undefined

  const header = (
    <p className={`text-sm leading-5 text-slate-900 ${isSelected ? 'font-semibold' : 'font-medium'}`}>{station.station_name}</p>
  )

  // Big number + category in its colour + one quiet line of context.
  const reading = (value: number, color: string, label: string, note: React.ReactNode) => (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold leading-none tracking-tight text-slate-950 tabular-nums">{value}</span>
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{note}</p>
    </div>
  )

  if (isHistorical) {
    return (
      <div className="min-w-0 max-w-[210px] space-y-1.5 sm:max-w-[230px]">
        {header}
        {historicalSummary ? (
          reading(
            historicalSummary.value,
            historicalSummary.category.color,
            historicalSummary.category.label,
            <>Average · {historicalSummary.detailLabel}</>,
          )
        ) : (
          <SkeletonBlock className="h-10 w-full" />
        )}
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-[210px] space-y-1.5 sm:max-w-[230px]">
      {header}

      {liveLoading ? (
        <SkeletonBlock className="h-10 w-full" />
      ) : liveError && !summary ? (
        <p className="text-xs text-rose-600">Live AQI unavailable.</p>
      ) : summary ? (
        reading(
          summary.value,
          summary.category.color,
          summary.category.label,
          <>
            {liveData?.cpcbStation ? 'CPCB' : liveData?.nearbySensor ? `Via ${liveData.nearbySensor.name} (${liveData.nearbySensor.distanceKm.toFixed(1)} km)` : 'WAQI'}
            {liveUpdatedAt ? <> · {formatWaqiTimestamp(liveUpdatedAt)}</> : null}
            {liveStale ? <span className="font-medium text-amber-700"> · stale</span> : null}
          </>,
        )
      ) : null}
    </div>
  )
}
