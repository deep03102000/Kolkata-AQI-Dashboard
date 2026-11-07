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
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />
}

function AlertBanner({ tone, children }: { tone: 'error' | 'loading'; children: React.ReactNode }) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-sky-200 bg-sky-50 text-sky-700'

  return <div className={`rounded-lg border px-2 py-1 text-[11px] leading-4 ${styles}`}>{children}</div>
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
    <div className="flex items-center justify-between gap-2">
      <p className="break-words text-sm font-semibold leading-5 text-slate-900">{station.station_name}</p>
      {isSelected ? (
        <span className="shrink-0 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
          Selected
        </span>
      ) : null}
    </div>
  )

  if (isHistorical) {
    return (
      <div className="min-w-0 max-w-[210px] space-y-2 sm:max-w-[230px]">
        {header}
        {historicalSummary ? (
          <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Average AQI</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${historicalSummary.category.className}`}>
                {historicalSummary.category.label}
              </span>
            </div>
            <p className="text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">{historicalSummary.value}</p>
            <p className="text-[11px] leading-4 text-slate-500">{historicalSummary.detailLabel}</p>
          </div>
        ) : (
          <SkeletonBlock className="h-16 w-full" />
        )}
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-[210px] space-y-2 sm:max-w-[230px]">
      {header}

      {liveLoading ? <AlertBanner tone="loading">Loading live AQI...</AlertBanner> : null}
      {liveError ? <AlertBanner tone="error">Live AQI unavailable.</AlertBanner> : null}

      {liveLoading ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
          <SkeletonBlock className="h-3 w-16" />
          <div className="flex items-end justify-between gap-2">
            <SkeletonBlock className="h-7 w-12 rounded-md" />
            <SkeletonBlock className="h-5 w-12 rounded-full" />
          </div>
        </div>
      ) : summary ? (
        <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {summary.sourceLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 ${summary.category.className}`}
            >
              {summary.category.label}
            </span>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">{summary.value}</p>
          {liveUpdatedAt ? (
            <p className="text-[11px] leading-4 text-slate-500">
              Updated {formatWaqiTimestamp(liveUpdatedAt)}
              {liveStale ? <span className="ml-1 font-semibold text-amber-700">· Stale</span> : null}
            </p>
          ) : null}
          {liveData?.nearbySensor ? (
            <p className="text-[11px] leading-4 text-amber-700">
              Via {liveData.nearbySensor.name} ({liveData.nearbySensor.distanceKm.toFixed(1)} km)
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
